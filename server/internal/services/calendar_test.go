package service

import (
	"errors"
	"testing"
)

func TestBuildWeeklyRecurrence(t *testing.T) {
	tests := []struct {
		name    string
		input   CreateEventInput
		want    string
		wantErr string
	}{
		{
			name:  "one-off event",
			input: CreateEventInput{Start: "2026-09-07T09:00:00-04:00", End: "2026-09-07T10:00:00-04:00"},
		},
		{
			name: "weekly never ends",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00-04:00",
				End:   "2026-09-07T10:00:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{
					Weekdays: []string{"MO", "WE"}, End: "never", TimeZone: "America/New_York",
				},
			},
			want: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE",
		},
		{
			name: "until is inclusive in recurrence timezone",
			input: CreateEventInput{
				Start: "2026-11-02T09:00:00-05:00",
				End:   "2026-11-02T10:00:00-05:00",
				Recurrence: &WeeklyRecurrenceInput{
					Weekdays: []string{"MO"}, End: "until", Until: "2026-11-09", TimeZone: "America/New_York",
				},
			},
			want: "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261110T045959Z",
		},
		{
			name:    "invalid start",
			input:   CreateEventInput{Start: "tomorrow", End: "2026-09-07T10:00:00Z"},
			wantErr: "start must be a valid RFC3339 timestamp",
		},
		{
			name:    "end before start",
			input:   CreateEventInput{Start: "2026-09-07T10:00:00Z", End: "2026-09-07T09:00:00Z"},
			wantErr: "end must be after start",
		},
		{
			name: "invalid timezone",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"MO"}, End: "never", TimeZone: "Mars/Olympus"},
			},
			wantErr: "recurrence timeZone must be a valid IANA timezone",
		},
		{
			name: "no weekdays",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{End: "never", TimeZone: "UTC"},
			},
			wantErr: "recurrence must include at least one weekday",
		},
		{
			name: "invalid weekday",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"XX"}, End: "never", TimeZone: "UTC"},
			},
			wantErr: `invalid recurrence weekday "XX"; use SU, MO, TU, WE, TH, FR, or SA`,
		},
		{
			name: "start weekday missing",
			input: CreateEventInput{
				Start: "2026-09-07T23:30:00-04:00", End: "2026-09-08T00:30:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"TU"}, End: "never", TimeZone: "America/New_York"},
			},
			wantErr: "recurrence weekdays must include the start date's local weekday",
		},
		{
			name: "until before local start",
			input: CreateEventInput{
				Start: "2026-09-07T23:30:00-04:00", End: "2026-09-08T00:30:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"MO"}, End: "until", Until: "2026-09-06", TimeZone: "America/New_York"},
			},
			wantErr: "recurrence until must not be before the local start date",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rules, err := buildWeeklyRecurrence(tt.input)
			if tt.wantErr != "" {
				var validationErr *ValidationError
				if !errors.As(err, &validationErr) {
					t.Fatalf("expected ValidationError, got %v", err)
				}
				if err.Error() != tt.wantErr {
					t.Fatalf("error = %q, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.want == "" {
				if rules != nil {
					t.Fatalf("rules = %v, want nil", rules)
				}
				return
			}
			if len(rules) != 1 || rules[0] != tt.want {
				t.Fatalf("rules = %v, want [%s]", rules, tt.want)
			}
		})
	}
}
