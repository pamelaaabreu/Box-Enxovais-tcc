package services

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"html/template"
	"log"
	"path/filepath"
	"strings"
	"time"

	"backend/src/models"
	"backend/src/repositories"

	"gopkg.in/gomail.v2"
)

// Envia o comprovante somente para a requisição que confirmou um pedido novo.
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
	recipient, err := (repositories.UserRepository{DB: database}).GetEmailRecipient(ctx, userID)
	if err != nil {
		log.Printf("[CHECKOUT EMAIL] pedido %d: destinatário indisponível", order.ID)
		return
	}

	if err := sendOrderMessage(recipient.Email, recipient.Name, order, cancelled); err != nil {
		log.Printf("[CHECKOUT EMAIL] pedido %d: falha na etapa %s", order.ID, err)
	}
}

func sendOrderMessage(email, name string, order models.CheckoutOrder, cancelled bool) error {
	message, err := buildOrderEmail(email, name, order, cancelled, "src/templates")
	if err != nil {
		return err
	}
	if err = sendSMTP(message); err != nil {
		return fmt.Errorf("envio SMTP")
	}
	return nil
}

func buildOrderEmail(email, name string, order models.CheckoutOrder, cancelled bool, templateDir string) (*gomail.Message, error) {

	filename, verb := "checkout_receipt.html", "confirmado"
	if cancelled {
		filename, verb = "order_cancelled.html", "cancelado"
	}
	money := func(cents models.Money) string { return fmt.Sprintf("R$ %d,%02d", cents/100, cents%100) }
	tmpl, err := template.New(filename).Funcs(template.FuncMap{"money": money, "plan": func(order models.CheckoutOrder) string {
		if order.Installments == nil {
			return "Parcelamento não registrado"
		}
		if *order.Installments == 1 {
			return "Pagamento à vista"
		}
		groups := []string{}
		for i := 0; i < len(order.InstallmentAmounts); {
			j := i + 1
			for j < len(order.InstallmentAmounts) && order.InstallmentAmounts[j] == order.InstallmentAmounts[i] {
				j++
			}
			groups = append(groups, fmt.Sprintf("%dx de %s", j-i, money(order.InstallmentAmounts[i])))
			i = j
		}
		return fmt.Sprintf("%d parcelas sem juros — %s", *order.Installments, strings.Join(groups, " + "))
	}}).
		ParseFiles(filepath.Join(templateDir, filename))
	if err != nil {
		return nil, fmt.Errorf("template")
	}
	var html bytes.Buffer
	if err := tmpl.Execute(&html, struct {
		Name  string
		Order models.CheckoutOrder
	}{name, order}); err != nil {
		return nil, fmt.Errorf("renderização")
	}

	var plain strings.Builder
	fmt.Fprintf(&plain, "Box Enxovais — Olá, %s!\nSeu pedido #%d foi %s.\n", name, order.ID, verb)
	for _, item := range order.ReceiptItems {
		fmt.Fprintf(&plain, "%d × %s — %s por unidade\n", item.Quantity, item.Name, money(item.UnitPrice))
	}
	fmt.Fprintf(&plain, "Total: %s\nPagamento simulado. Nenhuma cobrança foi realizada.", money(order.Total))
	if order.Installments != nil {
		label := "parcela"
		if *order.Installments > 1 {
			label = "parcelas"
		}
		fmt.Fprintf(&plain, "\nParcelamento: %d %s, sem juros.\n", *order.Installments, label)
		for _, amount := range order.InstallmentAmounts {
			fmt.Fprintf(&plain, "%s ", money(amount))
		}
	}
	msg := newEmailMessage(email, fmt.Sprintf("Box Enxovais — Pedido #%d %s", order.ID, verb), plain.String(), html.String())
	msg.Embed(filepath.Join(templateDir, "assets", "checkout-logo-white.png"), gomail.SetHeader(map[string][]string{
		"Content-ID":          {"<checkout-logo-white.png>"},
		"Content-Disposition": {"inline"},
	}))
	return msg, nil
}
