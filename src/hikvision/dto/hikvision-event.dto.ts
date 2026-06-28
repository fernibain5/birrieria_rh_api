/**
 * Represents a single access control event returned by the Hikvision ISAPI.
 * Field names match the raw JSON from the device.
 */
export interface HikvisionRawEvent {
  /** Employee ID as configured in the Hikvision device */
  employeeNoString: string;
  /** ISO datetime string of the event, e.g. "2025-01-15T08:30:00" */
  time: string;
  /**
   * Event sub-type from the device.
   * Common values: 75 = entry/check-in, 76 = exit/check-out.
   * May vary by firmware — raw data is also stored for debugging.
   */
  minor: number;
  /** Door/reader name */
  name?: string;
  /** Card number used */
  cardNo?: string;
}

export interface HikvisionAcsEventResponse {
  /** Actual field name returned by device firmware — NOT "AcsEventInfo" */
  InfoList: HikvisionRawEvent[];
  numOfMatches: number;
  totalMatches: number;
  responseStatusStrg: string;
}

export interface HikvisionApiResponse {
  AcsEvent: HikvisionAcsEventResponse;
}
