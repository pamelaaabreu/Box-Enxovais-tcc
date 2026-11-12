package main

import (
	"backend/src/config"
	"backend/src/db"
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"github.com/lib/pq"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

type imageEntry struct {
	File    string `json:"file"`
	Alt     string `json:"alt"`
	Primary bool   `json:"primary"`
}
type product struct {
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
	Images          []imageEntry      `json:"images"`
}
type manifest struct {
	Version  int       `json:"version"`
	Products []product `json:"products"`
}
type asset struct {
	imageEntry
	data     []byte
	filename string
	digest   [32]byte
}
type row struct {
	product
	assets  []asset
	pending []string
	exists  bool
}

var validKey = regexp.MustCompile("^[a-z0-9]+(-[a-z0-9]+)*$")

func decode(src io.Reader) (manifest, error) {
	var result manifest
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

func readAsset(root string, entry imageEntry, key string) (asset, error) {
	if !filepath.IsLocal(filepath.FromSlash(entry.File)) {
		return asset{}, errors.New("caminho inválido")
	}
	path, err := filepath.EvalSymlinks(filepath.Join(root, filepath.FromSlash(entry.File)))
	if err != nil {
		return asset{}, err
	}
	rel, err := filepath.Rel(root, path)
	if err != nil || !filepath.IsLocal(rel) {
		return asset{}, errors.New("imagem fora da pasta de origem")
	}
	f, err := os.Open(path)
	if err != nil {
		return asset{}, err
	}
	defer f.Close()
	const max = 10 * 1024 * 1024
	data, err := io.ReadAll(io.LimitReader(f, max+1))
	if err != nil {
		return asset{}, err
	}
	if len(data) > max {
		return asset{}, errors.New("imagem acima de 10 MB")
	}
	ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[http.DetectContentType(data)]
	if ext == "" {
		return asset{}, errors.New("formato não suportado")
	}
	digest := sha256.Sum256(data)
	return asset{entry, data, fmt.Sprintf("catalog-%s--%x%s", key, digest, ext), digest}, nil
}

func prepare(root string, m manifest) []row {
	seen := map[[32]byte]string{}
	result := make([]row, 0, len(m.Products))
	for _, p := range m.Products {
		r := row{product: p}
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

func option(ctx context.Context, tx *sql.Tx, table, name string, create bool) (int, error) {
	if name == "" {
		return 0, nil
	}
	rows, err := tx.QueryContext(ctx, "SELECT id FROM "+table+" WHERE lower(btrim(name))=lower($1)", name)
	if err != nil {
		return 0, err
	}
	var id int
	for rows.Next() {
		if id != 0 {
			rows.Close()
			return 0, fmt.Errorf("nome ambíguo: %s", name)
		}
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil || id != 0 || !create {
		return id, err
	}
	err = tx.QueryRowContext(ctx, "INSERT INTO "+table+"(name) VALUES($1) RETURNING id", name).Scan(&id)
	return id, err
}

func existing(ctx context.Context, tx *sql.Tx, p product) (bool, error) {
	var found bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS (
 SELECT 1 FROM products WHERE lower(btrim(name))=lower($1)
 UNION ALL SELECT 1 FROM product_images
 WHERE starts_with(replace(image_path,chr(92),'/'),'uploads/catalog-' || $2 || '--')
 )`, p.Name, p.Key).Scan(&found)
	return found, err
}

func put(dir string, a asset) error {
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

func optionalCare(care string) any {
	if strings.TrimSpace(care) == "" {
		return nil
	}
	return care
}

func applyProduct(ctx context.Context, database *sql.DB, dir string, r row, allowCreate bool, schema string) (bool, error) {
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SET LOCAL search_path TO "+pq.QuoteIdentifier(schema)); err != nil {
		return false, err
	}
	if _, err = tx.ExecContext(ctx, "LOCK TABLE product_types, brands, products, product_images IN SHARE ROW EXCLUSIVE MODE"); err != nil {
		return false, err
	}
	found, err := existing(ctx, tx, r.product)
	if found || err != nil {
		return false, err
	}
	category, err := option(ctx, tx, "product_types", r.Category, allowCreate)
	if err != nil {
		return false, err
	}
	brand, err := option(ctx, tx, "brands", r.Brand, allowCreate)
	if err != nil {
		return false, err
	}
	if category == 0 || r.Brand != "" && brand == 0 {
		return false, errors.New("cadastros auxiliares ausentes")
	}
	var brandID any
	if brand != 0 {
		brandID = brand
	}
	characteristics, err := json.Marshal(r.Characteristics)
	if err != nil {
		return false, err
	}
	var id int
	price := fmt.Sprintf("%d.%02d", *r.Price/100, *r.Price%100)
	err = tx.QueryRowContext(ctx, `INSERT INTO products
 (name,description,care_instructions,measurements,price,quantity,brand_id,product_type_id,status)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		r.Name, r.Description, optionalCare(r.Care), characteristics, price, *r.Stock, brandID, category, r.Status).Scan(&id)
	if err != nil {
		return false, err
	}
	if err = os.MkdirAll(dir, 0755); err != nil {
		return false, err
	}
	for _, a := range r.assets {
		if err = put(dir, a); err != nil {
			return false, err
		}
		_, err = tx.ExecContext(ctx, "INSERT INTO product_images(product_id,image_path,alt_text,is_primary) VALUES($1,$2,$3,$4)", id, "uploads/"+a.filename, a.Alt, a.Primary)
		if err != nil {
			return false, err
		}
	}
	// Keep content-addressed files on failure so a retry can reuse them, even if commit status was ambiguous.
	return true, tx.Commit()
}

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
	m, err := decode(file)
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
	rows := prepare(root, m)
	categories, brands := map[string]bool{}, map[string]bool{}
	ready, pictures, existingCount, pendingCount := 0, 0, 0, 0
	var candidates []row
	fmt.Printf("Modo: %s\n", map[bool]string{true: "importação", false: "dry-run (somente leitura)"}[*apply])
	for _, r := range rows {
		r.exists, err = existing(ctx, tx, r.product)
		if err != nil {
			return err
		}
		c, err := option(ctx, tx, "product_types", r.Category, false)
		if err != nil {
			return err
		}
		b, err := option(ctx, tx, "brands", r.Brand, false)
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
