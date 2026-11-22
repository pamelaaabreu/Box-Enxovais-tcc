package main

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

type catalogAsset struct {
	manifestImage
	data     []byte
	filename string
	digest   [32]byte
}
type preparedProduct struct {
	manifestProduct
	assets  []catalogAsset
	pending []string
	exists  bool
}

func readAsset(root string, entry manifestImage, key string) (catalogAsset, error) {
	if !filepath.IsLocal(filepath.FromSlash(entry.File)) {
		return catalogAsset{}, errors.New("caminho inválido")
	}
	path, err := filepath.EvalSymlinks(filepath.Join(root, filepath.FromSlash(entry.File)))
	if err != nil {
		return catalogAsset{}, err
	}
	rel, err := filepath.Rel(root, path)
	if err != nil || !filepath.IsLocal(rel) {
		return catalogAsset{}, errors.New("imagem fora da pasta de origem")
	}
	f, err := os.Open(path)
	if err != nil {
		return catalogAsset{}, err
	}
	defer f.Close()
	const max = 10 * 1024 * 1024
	data, err := io.ReadAll(io.LimitReader(f, max+1))
	if err != nil {
		return catalogAsset{}, err
	}
	if len(data) > max {
		return catalogAsset{}, errors.New("imagem acima de 10 MB")
	}
	ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[http.DetectContentType(data)]
	if ext == "" {
		return catalogAsset{}, errors.New("formato não suportado")
	}
	digest := sha256.Sum256(data)
	return catalogAsset{entry, data, fmt.Sprintf("catalog-%s--%x%s", key, digest, ext), digest}, nil
}

func prepareProducts(root string, m catalogManifest) []preparedProduct {
	seen := map[[32]byte]string{}
	result := make([]preparedProduct, 0, len(m.Products))
	for _, p := range m.Products {
		r := preparedProduct{manifestProduct: p}
		if !p.Approved {
			r.pending = append(r.pending, "aprovação editorial")
		}
		if strings.TrimSpace(p.Category) == "" || utf8.RuneCountInString(p.Category) > 100 || utf8.RuneCountInString(p.Brand) > 100 {
			r.pending = append(r.pending, "categoria ou marca inválida")
		}
		if strings.TrimSpace(p.Description) == "" || len(p.Characteristics) == 0 {
			r.pending = append(r.pending, "descrição ou características")
		}
		for label, value := range p.Characteristics {
			if strings.TrimSpace(label) == "" || strings.TrimSpace(value) == "" {
				r.pending = append(r.pending, "característica sem nome ou valor")
				break
			}
		}
		if p.Price == nil || *p.Price <= 0 || *p.Price > 9999999999 {
			r.pending = append(r.pending, "preço")
		}
		if p.Stock == nil || *p.Stock < 0 || *p.Stock > 2147483647 {
			r.pending = append(r.pending, "estoque inicial")
		}
		if p.Status != "active" && p.Status != "inactive" && p.Status != "archived" {
			r.pending = append(r.pending, "status")
		}
		primary := 0
		for _, image := range p.Images {
			a, err := readAsset(root, image, p.Key)
			if err != nil {
				r.pending = append(r.pending, fmt.Sprintf("%s: %v", image.File, err))
				continue
			}
			if prior := seen[a.digest]; prior != "" {
				r.pending = append(r.pending, "imagem idêntica a "+prior+": "+image.File)
			}
			seen[a.digest] = image.File
			if image.Primary {
				primary++
			}
			if strings.TrimSpace(image.Alt) == "" || utf8.RuneCountInString(image.Alt) > 100 {
				r.pending = append(r.pending, "texto alternativo: "+image.File)
			}
			r.assets = append(r.assets, a)
		}
		if primary != 1 {
			r.pending = append(r.pending, "definir uma imagem principal")
		}
		result = append(result, r)
	}
	return result
}

func writeAsset(dir string, a catalogAsset) error {
	path := filepath.Join(dir, a.filename)
	prior, err := os.ReadFile(path)
	if err == nil {
		if !bytes.Equal(prior, a.data) {
			return errors.New("imagem existente tem conteúdo diferente")
		}
		return nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	temp, err := os.CreateTemp(dir, ".catalog-*")
	if err != nil {
		return err
	}
	defer os.Remove(temp.Name())
	_, err = temp.Write(a.data)
	if err = errors.Join(err, temp.Close()); err != nil {
		return err
	}
	return os.Link(temp.Name(), path)
}
