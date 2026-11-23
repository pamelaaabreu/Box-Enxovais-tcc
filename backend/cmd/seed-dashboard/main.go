package main

import (
	"backend/src/config"
	"backend/src/db"
	"context"
	"crypto/sha256"
	_ "embed"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"time"
)

//go:embed seed.sql
var seedSQL string

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	development := flag.Bool("development", false, "Confirma ambiente de desenvolvimento, nunca produção")
	databaseName := flag.String("database", "", "Nome exato do banco autorizado")
	schema := flag.String("schema", "public", "Schema de destino")
	apply := flag.Bool("apply", false, "Confirma gravação; padrão executa e reverte")
	refreshCustomers := flag.Bool("refresh-customers", false, "Atualiza somente os perfis fictícios existentes, preservando pedidos e estoque")
	stock := flag.Bool("allow-stock-consumption", false, "Autoriza consumo das unidades dos pedidos aprovados")
	flag.Parse()
	if !*development || (!*stock && !*refreshCustomers) || *databaseName == "" || !regexp.MustCompile(`^[a-z][a-z0-9_]*$`).MatchString(*schema) {
		return fmt.Errorf("informe -development -database NOME, um schema válido e -allow-stock-consumption ou -refresh-customers")
	}
	cfg, err := config.Load(".env")
	if err != nil {
		return err
	}
	if cfg.Database.Name != *databaseName {
		return fmt.Errorf("banco configurado diverge do destino autorizado")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	database, err := db.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer database.Close()
	if *apply && *schema == "public" {
		if err := backup(ctx, cfg.Database); err != nil {
			return err
		}
	}
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("não foi possível iniciar a transação")
	}
	defer tx.Rollback()
	var exists bool
	if err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=$1)", *schema).Scan(&exists); err != nil || !exists {
		return fmt.Errorf("schema de destino não existe")
	}
	if _, err = tx.ExecContext(ctx, `SET LOCAL search_path TO "`+*schema+`"`); err != nil {
		return fmt.Errorf("não foi possível selecionar o schema")
	}
	if *refreshCustomers {
		if _, err = tx.ExecContext(ctx, `SET LOCAL box.seed_customers_only = 'on'`); err != nil {
			return fmt.Errorf("não foi possível selecionar atualização de perfis")
		}
	}
	if _, err = tx.ExecContext(ctx, seedSQL); err != nil {
		return fmt.Errorf("seed rejeitado; transação revertida: %w", err)
	}
	var customers, orders int
	err = tx.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM users WHERE password='!dashboard-demo-login-disabled' AND role='customer'),
        (SELECT count(*) FROM checkout_orders o JOIN users u ON u.id=o.user_id WHERE u.password='!dashboard-demo-login-disabled' AND u.role='customer' AND o.request_key LIKE 'dashboard-demo-202611-%')`).Scan(&customers, &orders)
	if err != nil || customers != 20 || orders != 35 {
		return fmt.Errorf("contagens inesperadas; transação revertida")
	}
	if !*apply {
		fmt.Printf("Validação revertida: %d clientes, %d pedidos. Sequências podem avançar; dados não persistidos.\n", customers, orders)
		return nil
	}
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("falha ao confirmar seed: %w", err)
	}
	if *refreshCustomers {
		fmt.Printf("Perfis fictícios atualizados em %s/%s: %d clientes; pedidos e estoque preservados.\n", *databaseName, *schema, customers)
		return nil
	}
	fmt.Printf("Seed confirmado em %s/%s: %d clientes, %d pedidos; reexecução não duplica nem consome estoque novamente.\n", *databaseName, *schema, customers, orders)
	return nil
}

func backup(ctx context.Context, cfg db.Config) error {
	directory := filepath.Join("..", "db", "backups")
	if err := os.MkdirAll(directory, 0700); err != nil {
		return fmt.Errorf("não foi possível criar diretório de backup")
	}
	file := filepath.Join(directory, "before-dashboard-seed-"+time.Now().Format("20060102-150405")+".dump")
	command := exec.CommandContext(ctx, "pg_dump", "-Fc", "-f", file)
	command.Env = append(os.Environ(), "PGHOST="+cfg.Host, "PGPORT="+strconv.Itoa(cfg.Port), "PGUSER="+cfg.User, "PGPASSWORD="+cfg.Password, "PGDATABASE="+cfg.Name, "PGSSLMODE="+cfg.SSLMode)
	if err := command.Run(); err != nil {
		return fmt.Errorf("backup falhou; seed não executado")
	}
	info, err := os.Stat(file)
	if err != nil || info.Size() == 0 {
		return fmt.Errorf("backup vazio ou ausente; seed não executado")
	}
	for _, args := range [][]string{{"--list", file}, {"--file", os.DevNull, file}} {
		if err := exec.CommandContext(ctx, "pg_restore", args...).Run(); err != nil {
			return fmt.Errorf("validação do backup falhou; seed não executado")
		}
	}
	input, err := os.Open(file)
	if err != nil {
		return err
	}
	defer input.Close()
	hash := sha256.New()
	if _, err = io.Copy(hash, input); err != nil {
		return err
	}
	absolute, _ := filepath.Abs(file)
	fmt.Printf("Backup validado: %s (%d bytes), SHA-256 %x\n", absolute, info.Size(), hash.Sum(nil))
	return nil
}
