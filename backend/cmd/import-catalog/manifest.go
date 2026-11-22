package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"unicode/utf8"
)

type manifestImage struct {
	File    string `json:"file"`
	Alt     string `json:"alt"`
	Primary bool   `json:"primary"`
}
type manifestProduct struct {
	Key             string            `json:"key"`
	Name            string            `json:"name"`
	Category        string            `json:"category"`
	Brand           string            `json:"brand"`
	Description     string            `json:"description"`
	Care            string            `json:"care"`
	Characteristics map[string]string `json:"characteristics"`
	Price           *int64            `json:"priceCents"`
	Stock           *int              `json:"stock"`
	Status          string            `json:"status"`
	Approved        bool              `json:"approved"`
	Images          []manifestImage   `json:"images"`
}
type catalogManifest struct {
	Version  int               `json:"version"`
	Products []manifestProduct `json:"products"`
}

var validKey = regexp.MustCompile("^[a-z0-9]+(-[a-z0-9]+)*$")

func decodeManifest(src io.Reader) (catalogManifest, error) {
	var result catalogManifest
	decoder := json.NewDecoder(src)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&result); err != nil {
		return result, err
	}
	if decoder.Decode(new(any)) != io.EOF {
		return result, errors.New("conteúdo após o manifesto")
	}
	if result.Version != 1 || len(result.Products) == 0 {
		return result, errors.New("manifesto vazio ou versão inválida")
	}
	keys, names := map[string]bool{}, map[string]bool{}
	for _, p := range result.Products {
		name := strings.ToLower(strings.TrimSpace(p.Name))
		if len(p.Key) > 90 || !validKey.MatchString(p.Key) || keys[p.Key] || name == "" || names[name] || utf8.RuneCountInString(p.Name) > 100 {
			return result, fmt.Errorf("chave ou nome inválido ou repetido: %s", p.Key)
		}
		keys[p.Key], names[name] = true, true
	}
	return result, nil
}
