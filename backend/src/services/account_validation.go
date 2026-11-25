package services

import (
	"backend/src/models"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// Formato de celular brasileiro com DDD válido.
var mobilePhone = regexp.MustCompile("^(1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9])9[0-9]{8}$")

var phoneFormat = regexp.MustCompile("^[0-9()+ .-]+$")

// Caracteres removidos durante a normalização do telefone.
var phoneSeparators = strings.NewReplacer(
	"(", "",
	")", "",
	" ", "",
	"-", "",
	".", "",
)

func NormalizeContactPhone(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)

	if raw == "" {
		return "", true
	}

	if !phoneFormat.MatchString(raw) {
		return "", false
	}

	// Remove a formatação e o código internacional brasileiro.
	normalized := strings.TrimPrefix(phoneSeparators.Replace(raw), "+55")

	return normalized, contactPhone.MatchString(normalized)
}

var contactPhone = regexp.MustCompile("^[1-9][0-9][0-9]{8,9}$")

// Aceita CPF com ou sem pontuação.
var cpfFormat = regexp.MustCompile("^([0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2})$")

func ValidateProfilePatch(p *models.AccountProfilePatch) string {

	// Valida o nome somente quando informado.
	if p.Name != nil {
		*p.Name = strings.TrimSpace(*p.Name)

		if n := utf8.RuneCountInString(*p.Name); n < 2 ||
			n > 200 ||
			strings.ContainsRune(*p.Name, 0) {

			return "Confira o nome completo"
		}
	}

	// Valida e normaliza o telefone.
	if p.Phone != nil {
		phone, ok := NormalizeContactPhone(*p.Phone)

		if !ok ||
			!mobilePhone.MatchString(phone) ||
			strings.Repeat("9", 9) == phone[2:] {

			return "Informe um celular com DDD e nove dígitos, começando com 9"
		}

		*p.Phone = phone
	}

	// Valida e normaliza o CPF.
	if p.NationalID != nil {
		cpf := strings.TrimSpace(*p.NationalID)

		if cpf != "" {

			if !cpfFormat.MatchString(cpf) {
				return "Informe um CPF válido"
			}

			cpf = strings.NewReplacer(".", "", "-", "").Replace(cpf)

			if !ValidCPF(cpf) {
				return "Informe um CPF válido"
			}
		}

		*p.NationalID = cpf
	}

	// Valida a data de nascimento quando preenchida.
	if p.BirthDate != nil && *p.BirthDate != "" {

		date, err := time.Parse(time.DateOnly, *p.BirthDate)
		now := time.Now()

		// Rejeita datas inválidas, futuras ou anteriores
		// ao limite de 130 anos.
		if err != nil ||
			date.Format(time.DateOnly) != *p.BirthDate ||
			*p.BirthDate > now.Format(time.DateOnly) ||
			*p.BirthDate < now.AddDate(-130, 0, 0).Format(time.DateOnly) {

			return "Informe uma data de nascimento válida"
		}
	}

	return ""
}

// Realiza a validação matemática dos dígitos do CPF.
// Pressupõe que o CPF já contém exatamente 11 dígitos.
func ValidCPF(cpf string) bool {
	if len(cpf) != 11 {
		return false
	}
	for _, digit := range cpf {
		if digit < '0' || digit > '9' {
			return false
		}
	}

	// Rejeita sequências de números repetidos.
	if cpf == strings.Repeat(cpf[:1], 11) {
		return false
	}

	// Calcula os dois dígitos verificadores.
	for length := 9; length <= 10; length++ {
		sum := 0

		for i := 0; i < length; i++ {
			sum += int(cpf[i]-'0') * (length + 1 - i)
		}

		// Compara o dígito calculado com o informado.
		if sum*10%11%10 != int(cpf[length]-'0') {
			return false
		}
	}

	return true
}
