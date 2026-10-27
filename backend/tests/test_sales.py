def test_sales_and_atomic_rollback(client, admin_headers):
    cat = client.post("/api/v1/categories", headers=admin_headers, json={"name": "Sale Cat"}).json()

    # Product 1: 10 units in stock
    p1 = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "SKU-SALE-1",
            "name": "Sale Product 1",
            "category_id": cat["id"],
            "cost_price": "20.00",
            "selling_price": "50.00",
            "opening_quantity": 10,
            "reorder_level": 2
        }
    ).json()

    # Product 2: 5 units in stock
    p2 = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "SKU-SALE-2",
            "name": "Sale Product 2",
            "category_id": cat["id"],
            "cost_price": "10.00",
            "selling_price": "25.00",
            "opening_quantity": 5,
            "reorder_level": 1
        }
    ).json()

    # 1. Attempt multi-product sale where product 2 has insufficient stock (req: 8, avail: 5)
    fail_sale = client.post(
        "/api/v1/sales",
        headers=admin_headers,
        json={
            "items": [
                {"product_id": p1["id"], "quantity": 4},
                {"product_id": p2["id"], "quantity": 8}
            ]
        }
    )
    assert fail_sale.status_code == 400
    assert "Insufficient stock" in fail_sale.json()["detail"]

    # Verify atomic rollback: neither product stock was modified!
    p1_check = client.get(f"/api/v1/products/{p1['id']}", headers=admin_headers).json()
    p2_check = client.get(f"/api/v1/products/{p2['id']}", headers=admin_headers).json()
    assert p1_check["quantity"] == 10
    assert p2_check["quantity"] == 5

    # 2. Successful multi-product sale
    ok_sale = client.post(
        "/api/v1/sales",
        headers=admin_headers,
        json={
            "discount_amount": "5.00",
            "items": [
                {"product_id": p1["id"], "quantity": 3},  # 3 * $50 = $150
                {"product_id": p2["id"], "quantity": 2}   # 2 * $25 = $50
            ]
        }
    )
    assert ok_sale.status_code == 201
    sale_data = ok_sale.json()
    assert sale_data["status"] == "COMPLETED"
    assert sale_data["subtotal"] == 200.0 or sale_data["subtotal"] == "200.00"
    assert sale_data["total_amount"] == 195.0 or sale_data["total_amount"] == "195.00"
    sale_id = sale_data["id"]

    # Verify stock deducted
    assert client.get(f"/api/v1/products/{p1['id']}", headers=admin_headers).json()["quantity"] == 7
    assert client.get(f"/api/v1/products/{p2['id']}", headers=admin_headers).json()["quantity"] == 3

    # 3. Cancel sale restores stock
    cancel_resp = client.post(f"/api/v1/sales/{sale_id}/cancel", headers=admin_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Verify quantities restored
    assert client.get(f"/api/v1/products/{p1['id']}", headers=admin_headers).json()["quantity"] == 10
    assert client.get(f"/api/v1/products/{p2['id']}", headers=admin_headers).json()["quantity"] == 5
