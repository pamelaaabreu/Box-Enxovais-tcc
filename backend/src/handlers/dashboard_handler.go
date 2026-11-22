package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"errors"
	"net/http"
	"time"
)

func dashboardPeriod(r *http.Request, now time.Time) (models.DashboardPeriod, error) {
	period := models.DashboardPeriod{Preset: r.URL.Query().Get("period"), Group: r.URL.Query().Get("group"), Timezone: "America/Sao_Paulo"}
	location, err := time.LoadLocation(period.Timezone)
	if err != nil {
		return period, err
	}
	now = now.In(location)
	today, _ := dashboardDate(now.Format(time.DateOnly), location)
	period.Until = today.AddDate(0, 0, 1)
	switch period.Preset {
	case "":
		period.Preset = "30d"
		period.From = today.AddDate(0, 0, -29)
	case "today":
		period.From = today
	case "7d":
		period.From = today.AddDate(0, 0, -6)
	case "30d":
		period.From = today.AddDate(0, 0, -29)
	case "month":
		period.From = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, location)
	case "last_month":
		period.Until = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, location)
		period.From = period.Until.AddDate(0, -1, 0)
	case "custom":
		period.From, err = dashboardDate(r.URL.Query().Get("dateFrom"), location)
		if err != nil || period.From.Year() < 1 {
			return period, errors.New("Informe uma data inicial válida.")
		}
		endDate, parseErr := dashboardDate(r.URL.Query().Get("dateTo"), location)
		if parseErr != nil || endDate.Year() < 1 || endDate.Before(period.From) {
			return period, errors.New("Informe uma data final igual ou posterior à inicial.")
		}
		period.Until = endDate.AddDate(0, 0, 1)
	default:
		return period, errors.New("Período inválido.")
	}
	if period.Until.Year() > 9999 {
		return period, errors.New("Data final fora do intervalo permitido.")
	}
	period.From, err = dashboardDate(period.From.Format(time.DateOnly), location)
	if err != nil {
		return period, err
	}
	period.Until, err = dashboardDate(period.Until.Format(time.DateOnly), location)
	if err != nil {
		return period, err
	}
	days := period.Until.Sub(period.From).Hours() / 24
	if period.Until.After(period.From.AddDate(5, 0, 0)) {
		return period, errors.New("O período máximo é de cinco anos.")
	}
	if period.Group == "" || period.Group == "auto" {
		period.Group = "day"
		if days > 93 {
			period.Group = "month"
		}
	}
	if period.Group != "day" && period.Group != "month" {
		return period, errors.New("Agrupamento inválido.")
	}
	if period.Group == "day" && days > 366 {
		return period, errors.New("Use agrupamento mensal para períodos maiores que um ano.")
	}
	return period, nil
}
func (h ProductHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	period, err := dashboardPeriod(r, time.Now())
	if err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	dashboard, err := h.Service.Store.Dashboard(r.Context(), period)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar os indicadores. Tente novamente.")
		return
	}
	response.JSON(w, 200, dashboard)
}

func dashboardDate(raw string, loc *time.Location) (time.Time, error) {
	date, err := time.Parse(time.DateOnly, raw)
	if err != nil || date.Year() < 1 {
		return time.Time{}, errors.New("Data inválida.")
	}
	local := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, loc)
	if local.Format(time.DateOnly) != raw {
		local = local.Add(time.Hour)
	}
	if local.Format(time.DateOnly) != raw {
		return time.Time{}, errors.New("Data local inválida.")
	}
	return local, nil
}
