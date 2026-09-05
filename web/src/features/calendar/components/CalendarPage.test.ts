import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { getCalendarLoadErrorMessage } from './CalendarPage';

describe('getCalendarLoadErrorMessage', () => {
  it('classifies Google Calendar rate-limit errors', () => {
    const error = new ApiError(429, 'google_calendar_rate_limited', 'quota exceeded');

    expect(getCalendarLoadErrorMessage(error)).toBe(
      'Google Calendar is temporarily rate limited. Try again shortly.'
    );
  });

  it('keeps generic errors generic', () => {
    expect(getCalendarLoadErrorMessage(new Error('network failure'))).toBe(
      'Failed to load events.'
    );
  });
});
