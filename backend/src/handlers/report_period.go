package handlers

import (
	"backend/src/models"
	"errors"
	"net/http"
	"time"
)

// Interpreta e valida o período solicitado.
func dashboardPeriod(r *http.Request, now time.Time) (models.DashboardPeriod, error) {

	period := models.DashboardPeriod{
		Preset:   r.URL.Query().Get("period"),
		Group:    r.URL.Query().Get("group"),
		Timezone: "America/Sao_Paulo",
	}

	location, err := time.LoadLocation(period.Timezone)

	if err != nil {
		return period, err
	}

	// Converte o horário atual para o fuso brasileiro.
	now = now.In(location)

	today, err := dashboardDate(
		now.Format(time.DateOnly),
		location,
	)

	if err != nil {
		return period, err
	}

	// Utiliza a data final como limite exclusivo.
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
		period.From = time.Date(
			now.Year(), now.Month(), 1,
			0, 0, 0, 0, location,
		)

	case "last_month":
		period.Until = time.Date(
			now.Year(), now.Month(), 1,
			0, 0, 0, 0, location,
		)

		period.From = period.Until.AddDate(0, -1, 0)

	case "custom":

		// Valida a data inicial personalizada.
		period.From, err = dashboardDate(
			r.URL.Query().Get("dateFrom"),
			location,
		)

		if err != nil || period.From.Year() < 1 {
			return period, errors.New("Informe uma data inicial válida.")
		}

		// Valida a data final personalizada.
		endDate, parseErr := dashboardDate(
			r.URL.Query().Get("dateTo"),
			location,
		)

		if parseErr != nil ||
			endDate.Year() < 1 ||
			endDate.Before(period.From) {

			return period, errors.New("Informe uma data final igual ou posterior à inicial.")
		}

		period.Until = endDate.AddDate(0, 0, 1)

	default:
		return period, errors.New("Período inválido.")
	}

	if period.Until.Year() > 9999 {
		return period, errors.New("Data final fora do intervalo permitido.")
	}

	// Normaliza novamente as datas no fuso local.
	period.From, err = dashboardDate(
		period.From.Format(time.DateOnly),
		location,
	)

	if err != nil {
		return period, err
	}

	period.Until, err = dashboardDate(
		period.Until.Format(time.DateOnly),
		location,
	)

	if err != nil {
		return period, err
	}

	// Calcula a duração do período em dias.
	days := civilDays(period.From, period.Until)

	// Limita o período a cinco anos.
	if period.Until.After(period.From.AddDate(maximumPeriodYears, 0, 0)) {
		return period, errors.New("O período máximo é de cinco anos.")
	}

	// Determina automaticamente o agrupamento.
	if period.Group == "" || period.Group == "auto" {

		period.Group = "day"

		if days > automaticDailyDays {
			period.Group = "month"
		}
	}

	// Permite somente agrupamentos diários e mensais.
	if period.Group != "day" && period.Group != "month" {
		return period, errors.New("Agrupamento inválido.")
	}

	// Limita a quantidade de pontos do agrupamento diário.
	if period.Group == "day" && days > maximumDailyDays {
		return period, errors.New("Use agrupamento mensal para períodos maiores que um ano.")
	}

	return period, nil
}

// Converte uma data textual em uma data local.
func dashboardDate(raw string, loc *time.Location) (time.Time, error) {

	if loc == nil {
		return time.Time{}, errors.New("Fuso horário inválido.")
	}
	date, err := time.Parse(time.DateOnly, raw)

	if err != nil || date.Year() < 1 {
		return time.Time{}, errors.New("Data inválida.")
	}

	local := time.Date(
		date.Year(), date.Month(), date.Day(),
		0, 0, 0, 0, loc,
	)

	// Trata possíveis deslocamentos na meia-noite local,
	// como aqueles associados ao horário de verão.
	if local.Format(time.DateOnly) != raw {
		local = local.Add(time.Hour)
	}

	if local.Format(time.DateOnly) != raw {
		return time.Time{}, errors.New("Data local inválida.")
	}

	return local, nil
}

const (
	automaticDailyDays = 93
	maximumDailyDays   = 366
	maximumPeriodYears = 5
)

func civilDays(from, until time.Time) int {
	start := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(until.Year(), until.Month(), until.Day(), 0, 0, 0, 0, time.UTC)
	return int(end.Sub(start) / (24 * time.Hour))
}
