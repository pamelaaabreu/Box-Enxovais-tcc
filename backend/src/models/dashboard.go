package models

import "time"

type DashboardPeriod struct {
	Preset   string    `json:"preset"` // período definido
	From     time.Time `json:"from"`   // limite inclusivo
	Until    time.Time `json:"until"`  // limite exclusivo: [From, Until)
	Group    string    `json:"group"`  // agrupamento dia/mês
	Timezone string    `json:"timezone"`
}
