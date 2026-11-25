package models

import "strconv"

// Tipo personalizado que representa valores monetários internamente em centavos, evitando imprecisões de ponto flutuante.
type Money int64

// Personaliza a serialização JSON do tipo Money, convertendo centavos para um valor decimal em reais.
func (m Money) MarshalJSON() ([]byte, error) {
	whole, cents := int64(m)/100, int64(m)%100
	sign := ""
	if m < 0 {
		sign = "-"
		// Divide antes de inverter o sinal para também suportar math.MinInt64.
		whole, cents = -whole, -cents
	}
	return []byte(sign + strconv.FormatInt(whole, 10) + "." + leftPadCents(cents)), nil
}

// Garante dois dígitos na representação de centavos para valores não negativos.
func leftPadCents(value int64) string {
	if value < 10 {
		return "0" + strconv.FormatInt(value, 10)
	}
	return strconv.FormatInt(value, 10)
}
