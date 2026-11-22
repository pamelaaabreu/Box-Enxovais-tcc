package models

import "time"

type DashboardPeriod struct {
	Preset   string    `json:"preset"`
	From     time.Time `json:"from"`
	Until    time.Time `json:"until"`
	Group    string    `json:"group"`
	Timezone string    `json:"timezone"`
}
