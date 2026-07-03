import { Injectable, Logger } from '@nestjs/common';
import { Restaurant } from '@prisma/client';
import { digestRequest } from './digest-auth.util';
import {
  HikvisionRawEvent,
  HikvisionApiResponse,
  HikvisionUserInfoApiResponse,
} from './dto/hikvision-event.dto';

/** Hikvision minor event codes → attendance event type mapping.
 *  Confirmed on DS-K series firmware from real device capture.
 *  Unknown codes default to 'check-in' (see fallback in fetchEvents).
 */
const EVENT_TYPE_MAP: Record<number, 'check-in' | 'check-out'> = {
  // Standard entry/check-in
  1: 'check-in',
  75: 'check-in',   // Normal card/fingerprint — entry
  104: 'check-in',  // Multi-factor / face+fp — entry (observed on DS-K device)
  // Standard exit/check-out
  2: 'check-out',
  76: 'check-out',  // Normal card/fingerprint — exit
  38: 'check-out',  // Observed on DS-K device at exit (needs confirmation per install)
};

export interface DevicePerson {
  hikvisionId: string;
  name: string;
}

export interface ParsedAttendanceEvent {
  hikvisionId: string;
  checkedAt: Date;
  eventType: 'check-in' | 'check-out';
  deviceIp: string;
  rawData: HikvisionRawEvent;
}

@Injectable()
export class HikvisionService {
  private readonly logger = new Logger(HikvisionService.name);

  /**
   * Fetch all attendance events from the Hikvision device for a given time range.
   * Handles Digest Authentication and paginates through all results automatically.
   *
   * @param restaurant - Restaurant record containing device IP and credentials
   * @param startTime  - Start of the query window
   * @param endTime    - End of the query window
   */
  async fetchEvents(
    restaurant: Restaurant,
    startTime: Date,
    endTime: Date,
  ): Promise<ParsedAttendanceEvent[]> {
    const url = `http://${restaurant.hikvisionIp}/ISAPI/AccessControl/AcsEvent?format=json`;
    const startIso = startTime.toISOString().replace(/\.\d{3}Z$/, '');
    // Add 24h to end time so UTC-based timestamps cover any device timezone offset.
    // Hikvision devices store events in local time; sending "now UTC" as endTime
    // can exclude recent events on devices ahead of UTC (e.g. UTC+8).
    // The upsert in AttendanceService makes receiving duplicate/future events safe.
    const endWithBuffer = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    const endIso = endWithBuffer.toISOString().replace(/\.\d{3}Z$/, '');

    const allEvents: ParsedAttendanceEvent[] = [];
    let position = 0;
    const maxResults = 1000;

    this.logger.log(
      `Fetching events from ${restaurant.hikvisionIp} | window: ${startIso} → ${endIso}`,
    );

    while (true) {
      const response = await digestRequest({
        method: 'POST',
        url,
        timeout: 10_000,
        username: restaurant.hikvisionUser,
        password: restaurant.hikvisionPass,
        data: {
          AcsEventCond: {
            searchID: String(Date.now()),
            searchResultPosition: position,
            maxResults,
            major: 5,
            minor: 0, // Required by this firmware — 0 means "all subtypes"
            startTime: startIso,
            endTime: endIso,
          },
        },
      });

      const body = response.data as HikvisionApiResponse;
      const acsEvent = body?.AcsEvent;
      // Field is "InfoList" on this firmware (not "AcsEventInfo" as in older docs)
      const batch: HikvisionRawEvent[] = acsEvent?.InfoList ?? [];

      for (const raw of batch) {
        // Skip door/system events that have no employee attached
        if (!raw.employeeNoString) continue;

        allEvents.push({
          hikvisionId: String(raw.employeeNoString),
          checkedAt: new Date(raw.time),
          eventType: EVENT_TYPE_MAP[raw.minor] ?? 'check-in',
          deviceIp: restaurant.hikvisionIp,
          rawData: raw,
        });
      }

      this.logger.log(
        `Fetched page at position ${position}: ${batch.length} records | status: ${acsEvent?.responseStatusStrg}, totalMatches: ${acsEvent?.totalMatches}`,
      );

      // The device may clamp the page size below maxResults (like the person
      // search does), so rely on its MORE/OK status and advance by the actual
      // batch length instead of assuming a short page means the last one.
      if (acsEvent?.responseStatusStrg !== 'MORE' || batch.length === 0) break;
      position += batch.length;
    }

    this.logger.log(`Total events fetched: ${allEvents.length}`);
    return allEvents;
  }

  /**
   * Fetch the full person list from the Hikvision device. Used by the sync to
   * auto-create Employee rows for people enrolled directly on the device
   * screen (whose punches would otherwise be skipped as "no employee found").
   */
  async fetchPersons(restaurant: Restaurant): Promise<DevicePerson[]> {
    const url = `http://${restaurant.hikvisionIp}/ISAPI/AccessControl/UserInfo/Search?format=json`;

    const persons: DevicePerson[] = [];
    let position = 0;
    // The device clamps the page size (typically to 30) regardless of what we
    // ask for, so pagination advances by the actual batch length.
    const maxResults = 100;

    while (true) {
      const response = await digestRequest({
        method: 'POST',
        url,
        timeout: 10_000,
        username: restaurant.hikvisionUser,
        password: restaurant.hikvisionPass,
        data: {
          UserInfoSearchCond: {
            searchID: String(Date.now()),
            searchResultPosition: position,
            maxResults,
          },
        },
      });

      const body = response.data as HikvisionUserInfoApiResponse;
      const search = body?.UserInfoSearch;
      const batch = search?.UserInfo ?? [];

      for (const raw of batch) {
        if (!raw.employeeNo) continue;
        persons.push({
          hikvisionId: String(raw.employeeNo),
          name: raw.name?.trim() || `Empleado ${raw.employeeNo}`,
        });
      }

      if (search?.responseStatusStrg !== 'MORE' || batch.length === 0) break;
      position += batch.length;
    }

    this.logger.log(
      `Total persons on device ${restaurant.hikvisionIp}: ${persons.length}`,
    );
    return persons;
  }

  /**
   * Enroll (or overwrite) a person on the Hikvision access-control device via
   * ISAPI so the device will actually accept card/fingerprint/PIN punches for
   * them. Without this call the device never learns about the employee, even
   * though we already track them in our own `Employee` table.
   *
   * Hikvision's UserInfo/Record requires a numeric `password` (the PIN the
   * employee types at the keypad) — omitting it causes the device to reject
   * the record.
   */
  async createPerson(
    restaurant: Restaurant,
    employeeNo: string,
    name: string,
    passcode: string,
  ): Promise<void> {
    const url = `http://${restaurant.hikvisionIp}/ISAPI/AccessControl/UserInfo/Record?format=json`;

    this.logger.log(
      `Provisioning employee ${employeeNo} on device ${restaurant.hikvisionIp}`,
    );

    await digestRequest({
      method: 'PUT',
      url,
      timeout: 10_000,
      username: restaurant.hikvisionUser,
      password: restaurant.hikvisionPass,
      data: {
        UserInfo: {
          employeeNo,
          name,
          userType: 'normal',
          Valid: {
            enable: true,
            beginTime: '2020-01-01T00:00:00',
            endTime: '2037-12-31T23:59:59',
            timeType: 'local',
          },
          password: passcode,
          doorRight: '1',
          RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
        },
      },
    });
  }
}
