package main

import (
	"backend/src/config"
	"backend/src/db"
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"github.com/lib/pq"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func run() error {
	manifestPath := flag.String("manifest", "../docs/catalogo-cama.json", "arquivo JSON")
	source := flag.String("images", "", "pasta raiz das imagens")
	apply := flag.Bool("apply", false, "gravar produtos aprovados")
	allowCreate := flag.Bool("create-options", false, "autorizar criação de categorias e marcas ausentes")
	flag.Parse()
	if *source == "" {
		return errors.New("informe -images")
	}
	root, err := filepath.Abs(*source)
	if err != nil {
		return err
	}
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return err
	}
	file, err := os.Open(*manifestPath)
	if err != nil {
		return err
	}
	defer file.Close()
	m, err := decodeManifest(file)
	if err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.Database.Name != "bd_box" || (cfg.Database.Host != "localhost" && cfg.Database.Host != "127.0.0.1" && cfg.Database.Host != "::1") {
		return errors.New("destino diferente de bd_box local")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	database, err := db.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer database.Close()
	tx, err := database.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SET LOCAL search_path TO "+pq.QuoteIdentifier("public")); err != nil {
		return err
	}
	rows := prepareProducts(root, m)
	categories, brands := map[string]bool{}, map[string]bool{}
	ready, pictures, existingCount, pendingCount := 0, 0, 0, 0
	var candidates []preparedProduct
	fmt.Printf("Modo: %s\n", map[bool]string{true: "importação", false: "dry-run (somente leitura)"}[*apply])
	for _, r := range rows {
		r.exists, err = productExists(ctx, tx, r.manifestProduct)
		if err != nil {
			return err
		}
		c, err := resolveCatalogOption(ctx, tx, "product_types", r.Category, false)
		if err != nil {
			return err
		}
		b, err := resolveCatalogOption(ctx, tx, "brands", r.Brand, false)
		if err != nil {
			return err
		}
		missingCategory, missingBrand := r.Category != "" && c == 0, r.Brand != "" && b == 0
		if !*allowCreate {
			if missingCategory {
				r.pending = append(r.pending, "categoria ausente: "+r.Category)
			}
			if missingBrand {
				r.pending = append(r.pending, "marca ausente: "+r.Brand)
			}
		}
		fmt.Printf("\n%s | %d/%d imagens verificadas\n", r.Name, len(r.assets), len(r.Images))
		for _, a := range r.assets {
			fmt.Printf("  %s | %d bytes | sha256=%x\n", a.File, len(a.data), a.digest)
		}
		switch {
		case r.exists:
			existingCount++
			fmt.Println("  Já cadastrado, nenhuma alteração prevista")
		case len(r.pending) > 0:
			pendingCount++
			fmt.Println("  Pendente: " + strings.Join(r.pending, "; "))
		default:
			candidates = append(candidates, r)
			ready++
			pictures += len(r.assets)
			if missingCategory {
				categories[strings.ToLower(r.Category)] = true
			}
			if missingBrand {
				brands[strings.ToLower(r.Brand)] = true
			}
		}
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	fmt.Printf("\nProdutos a criar: %d | Categorias a criar: %d | Marcas a criar: %d | Imagens a associar: %d | Pendentes: %d | Existentes: %d\n", ready, len(categories), len(brands), pictures, pendingCount, existingCount)
	if !*apply {
		return nil
	}
	var failures []error
	for _, r := range candidates {
		created, err := applyProduct(ctx, database, cfg.UploadDir, r, *allowCreate, "public")
		if err != nil {
			failures = append(failures, fmt.Errorf("%s: %w", r.Key, err))
			continue
		}
		fmt.Printf("%s criado=%t\n", r.Key, created)
	}
	return errors.Join(failures...)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
