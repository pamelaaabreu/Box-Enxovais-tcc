package services

import (
	"backend/src/models"
	"regexp"
	"strings"
)

var shippingCEPPattern = regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`)

// Valida e normaliza os campos do endereço.
func ValidShippingAddress(a *models.ShippingAddress) bool {
	if a == nil {
		return false
	}

	fields := []*string{
		&a.Recipient,
		&a.ZipCode,
		&a.Street,
		&a.Number,
		&a.Complement,
		&a.Neighborhood,
		&a.City,
		&a.State,
	}

	// Remove espaços dos campos originais.
	for _, field := range fields {
		*field = strings.TrimSpace(*field)
	}

	// Valida os campos obrigatórios.
	for _, field := range []string{
		a.Recipient,
		a.Street,
		a.Number,
		a.Neighborhood,
		a.City,
	} {
		if field == "" ||
			len(field) > 200 ||
			strings.ContainsRune(field, 0) {

			return false
		}
	}

	// Estados brasileiros permitidos.
	const states = "|AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO|"

	// Valida complemento, estado e CEP.
	return len(a.Complement) <= 200 &&
		!strings.ContainsRune(a.Complement, 0) &&
		len(a.State) == 2 &&
		strings.Contains(states, "|"+a.State+"|") &&
		shippingCEPPattern.MatchString(a.ZipCode)
}
