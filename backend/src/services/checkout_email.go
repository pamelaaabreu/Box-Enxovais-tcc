package services

import (
	"backend/src/models"
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"html/template"
	"log"
	"os"
	"strings"
	"time"

	"gopkg.in/gomail.v2"
)

// SendCheckoutReceipt is called only for the request that committed a new order.
func SendCheckoutReceipt(database *sql.DB, userID int, order models.CheckoutOrder) {
	sendOrderEmail(database, userID, order, false)
}

func SendOrderCancellation(database *sql.DB, userID int, details models.OrderDetails) {
	order := details.CheckoutOrder
	for _, item := range details.Items {
		order.ReceiptItems = append(order.ReceiptItems, models.CartItem{Name: item.Name, Quantity: item.Quantity, UnitPrice: item.UnitPrice})
	}
	sendOrderEmail(database, userID, order, true)
}

func sendOrderEmail(database *sql.DB, userID int, order models.CheckoutOrder, cancelled bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var name, email string
	err := database.QueryRowContext(ctx, "SELECT full_name, email FROM users WHERE id=$1", userID).Scan(&name, &email)
	if err != nil {
		log.Printf("[CHECKOUT EMAIL] pedido %d: destinatário indisponível", order.ID)
		return
	}

	if err := sendOrderMessage(email, name, order, cancelled); err != nil {
		log.Printf("[CHECKOUT EMAIL] pedido %d: falha na etapa %s", order.ID, err)
	}
}

func sendOrderMessage(email, name string, order models.CheckoutOrder, cancelled bool) error {
	filename, verb := "checkout_receipt.html", "confirmado"
	if cancelled {
		filename, verb = "order_cancelled.html", "cancelado"
	}
	money := func(cents models.Money) string { return fmt.Sprintf("R$ %d,%02d", cents/100, cents%100) }
	tmpl, err := template.New(filename).Funcs(template.FuncMap{"money": money}).
		ParseFiles("src/templates/" + filename)
	if err != nil {
		return fmt.Errorf("template")
	}
	var html bytes.Buffer
	if err := tmpl.Execute(&html, struct {
		Name  string
		Order models.CheckoutOrder
	}{name, order}); err != nil {
		return fmt.Errorf("renderização")
	}
	from, host, key := os.Getenv("EMAIL"), os.Getenv("EMAIL_SMTP"), os.Getenv("EMAIL_KEY")
	if from == "" || host == "" || key == "" {
		return fmt.Errorf("configuração SMTP")
	}

	var plain strings.Builder
	fmt.Fprintf(&plain, "Box Enxovais — Olá, %s!\nSeu pedido #%d foi %s.\n", name, order.ID, verb)
	for _, item := range order.ReceiptItems {
		fmt.Fprintf(&plain, "%d × %s — %s por unidade\n", item.Quantity, item.Name, money(item.UnitPrice))
	}
	fmt.Fprintf(&plain, "Total: %s\nPagamento simulado. Nenhuma cobrança foi realizada.", money(order.Total))
	msg := gomail.NewMessage()
	msg.SetHeader("From", from)
	msg.SetHeader("To", email)
	msg.SetHeader("Subject", fmt.Sprintf("Box Enxovais — Pedido #%d %s", order.ID, verb))
	msg.SetBody("text/plain", plain.String())
	msg.AddAlternative("text/html", html.String())
	msg.Embed("src/templates/assets/checkout-logo-white.png", gomail.SetHeader(map[string][]string{
		"Content-ID":          {"<checkout-logo-white.png>"},
		"Content-Disposition": {"inline"},
	}))
	if err := gomail.NewDialer(host, 587, from, key).DialAndSend(msg); err != nil {
		return fmt.Errorf("envio SMTP")
	}
	return nil
}
