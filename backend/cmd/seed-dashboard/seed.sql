SELECT pg_advisory_xact_lock(53020261122);
SET LOCAL lock_timeout = '10s';
DO $seed$
DECLARE
    customers_only boolean := coalesce(current_setting('box.seed_customers_only',true),'off') = 'on';
    names text[] := ARRAY['Ana Carolina Martins','Bruno Henrique Silva','Camila Rodrigues Costa','Daniel Oliveira Santos','Elisa Fernanda Almeida','Felipe Augusto Pereira','Gabriela Ribeiro Lima','Henrique Barbosa Souza','Isabela Cristina Rocha','João Pedro Ferreira','Juliana Mendes Carvalho','Lucas Rafael Moreira','Mariana Azevedo Nunes','Mateus Vieira Gomes','Natália Beatriz Teixeira','Paulo Ricardo Batista','Renata Alves Cardoso','Ricardo Duarte Monteiro','Sofia Helena Araújo','Thiago Vinícius Ribeiro'];
    emails text[] := ARRAY['ana.martins@example.test','bruno.silva@example.test','camila.costa@example.test','daniel.santos@example.test','elisa.almeida@example.test','felipe.pereira@example.test','gabriela.lima@example.test','henrique.souza@example.test','isabela.rocha@example.test','joao.ferreira@example.test','juliana.carvalho@example.test','lucas.moreira@example.test','mariana.nunes@example.test','mateus.gomes@example.test','natalia.teixeira@example.test','paulo.batista@example.test','renata.cardoso@example.test','ricardo.monteiro@example.test','sofia.araujo@example.test','thiago.ribeiro@example.test'];
    n integer;
    customer_id integer;
    order_id bigint;
    existing_count integer;
    day_offset integer;
    moment timestamptz;
    chosen record;
    delivery record;
    subtotal bigint;
    charged bigint;
    is_cancelled boolean;
    days integer[] := ARRAY[0,0,1,3,3,3,5,6,8,8,9,11,11,11,12,14,15,15,17,18,18,18,20,21,22,22,24,24,25,26,27,28,29,29,29];
BEGIN
    SELECT count(*) INTO existing_count FROM users WHERE email LIKE 'dashboard-202611-%@example.invalid' OR email = ANY(emails);
    IF existing_count NOT IN (0,20) OR (customers_only AND existing_count <> 20) THEN
        RAISE EXCEPTION 'Seed parcial ou colisão de identificadores de clientes; nenhuma alteração aplicada';
    END IF;
    IF existing_count = 20 AND EXISTS(SELECT 1 FROM users WHERE (email LIKE 'dashboard-202611-%@example.invalid' OR email = ANY(emails)) AND (password <> '!dashboard-demo-login-disabled' OR role <> 'customer')) THEN
        RAISE EXCEPTION 'Identificadores do seed pertencem a registros diferentes';
    END IF;
    FOR n IN 1..20 LOOP
        UPDATE users SET full_name=names[n], email=emails[n], phone='(44) 90000-' || lpad((100+n)::text,4,'0')
        WHERE email IN ('dashboard-202611-' || lpad(n::text,2,'0') || '@example.invalid',emails[n])
          AND password='!dashboard-demo-login-disabled' AND role='customer';
        IF NOT customers_only THEN
        INSERT INTO users(full_name,email,phone,password,role,created_at)
        VALUES(names[n], emails[n], '(44) 90000-' || lpad((100+n)::text,4,'0'),
            '!dashboard-demo-login-disabled','customer',
            (date '2026-10-24' + ((n-1)*29/19) + time '08:00') AT TIME ZONE 'America/Sao_Paulo')
        ON CONFLICT(email) DO NOTHING;
        END IF;
    END LOOP;
    IF customers_only THEN
        IF (SELECT count(*) FROM users WHERE email=ANY(emails) AND password='!dashboard-demo-login-disabled' AND role='customer') <> 20 THEN
            RAISE EXCEPTION 'Conjunto de perfis divergente; atualização revertida';
        END IF;
        RETURN;
    END IF;
    LOCK TABLE products, product_variants IN SHARE ROW EXCLUSIVE MODE;
    SELECT * INTO delivery FROM shipping_ranges WHERE active ORDER BY start_cep,id LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Configure uma faixa de entrega ativa antes do seed'; END IF;
    FOR n IN 1..35 LOOP
        day_offset := days[n];
        moment := (date '2026-10-24' + day_offset + make_time(10+n%10,n%60,0)) AT TIME ZONE 'America/Sao_Paulo';
        SELECT id INTO customer_id FROM users
        WHERE email = emails[day_offset*19/29+1];
        IF EXISTS(SELECT 1 FROM checkout_orders WHERE user_id=customer_id AND request_key='dashboard-demo-202611-' || n) THEN CONTINUE; END IF;
        SELECT p.id, p.name, v.id AS variant_id, v.size, (coalesce(v.price,p.price)*100)::bigint AS original,
            (CASE WHEN v.id IS NOT NULL THEN v.price ELSE least(p.price,coalesce((SELECT min(pp.promotional_price)
             FROM promotion_products pp JOIN promotions pr ON pr.id=pp.promotion_id
             WHERE pp.product_id=p.id AND pr.status='active' AND pr.start_date<=moment AND pr.end_date>=moment AND pp.promotional_price>=0),p.price)) END *100)::bigint AS price
        INTO chosen FROM products p LEFT JOIN product_variants v ON v.product_id=p.id
        WHERE p.status='active' AND coalesce(v.quantity,p.quantity)>0 AND coalesce(v.price,p.price)>0
        ORDER BY md5(p.id::text || ':' || coalesce(v.id,0)::text || ':' || n::text) LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente; seed inteiro revertido'; END IF;
        subtotal := chosen.original;
        charged := chosen.price;
        is_cancelled := n%6=0;
        INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at,
            stock_debited,contact_phone,shipping_cents,shipping_min_days,shipping_max_days,shipping_method,
            products_subtotal_cents,discount_cents,installments)
        VALUES(customer_id,'dashboard-demo-202611-' || n,
            jsonb_build_object('recipient',names[day_offset*19/29+1],'zipCode',lpad(delivery.start_cep::text,8,'0'),
                'street','Endereço demonstrativo','number','1','neighborhood','Demonstração','city','Demonstração','state','PR'),
            'pix',CASE WHEN is_cancelled THEN 'cancelled' ELSE 'simulated_approved' END,
            charged+delivery.price_cents,moment,true,NULL,delivery.price_cents,delivery.min_days,delivery.max_days,
            'delivery',subtotal,subtotal-charged,1) RETURNING id INTO order_id;
        INSERT INTO checkout_order_items(order_id,product_id,variant_id,name,quantity,unit_price_cents)
        VALUES(order_id,chosen.id,chosen.variant_id,chosen.name || coalesce(' — ' || chosen.size,''),1,charged);
        IF is_cancelled THEN
            INSERT INTO order_cancellations(order_id,reason_code,cancelled_at,cancelled_by)
            VALUES(order_id,'changed_mind',moment+interval '30 minutes',customer_id);
        ELSIF chosen.variant_id IS NOT NULL THEN
            UPDATE product_variants SET quantity=quantity-1 WHERE id=chosen.variant_id;
        ELSE
            UPDATE products SET quantity=quantity-1,updated_at=now() WHERE id=chosen.id;
        END IF;
    END LOOP;
END $seed$;
