def test_inventory_adjust_and_receive(client, admin_headers):
    # Setup category & product
    cat = client.post("/api/v1/categories", headers=admin_headers, json={"name": "Testing Inv"}).json()
    prod = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "SKU-INV-1",
            "name": "Inventory Item",
            "category_id": cat["id"],
            "cost_price": "10.00",
            "selling_price": "20.00",
            "opening_quantity": 10,
            "reorder_level": 5
        }
    ).json()
    p_id = prod["id"]

    # 1. Adjust Increase
    adj_inc = client.post(
        "/api/v1/inventory/adjust",
        headers=admin_headers,
        json={
            "product_id": p_id,
            "adjustment_type": "INCREASE",
            "quantity": 5,
            "reason": "Found 5 units in backroom during audit"
        }
    )
    assert adj_inc.status_code == 201
    assert adj_inc.json()["quantity_after"] == 15

    # 2. Adjust Decrease
    adj_dec = client.post(
        "/api/v1/inventory/adjust",
        headers=admin_headers,
        json={
            "product_id": p_id,
            "adjustment_type": "DECREASE",
            "quantity": 3,
            "reason": "Damaged items written off"
        }
    )
    assert adj_dec.status_code == 201
    assert adj_dec.json()["quantity_after"] == 12

    # 3. Reject negative stock adjustment
    adj_neg = client.post(
        "/api/v1/inventory/adjust",
        headers=admin_headers,
        json={
            "product_id": p_id,
            "adjustment_type": "DECREASE",
            "quantity": 50,  # only 12 in stock
            "reason": "Accidental overdraft"
        }
    )
    assert adj_neg.status_code == 400
    assert "Negative stock is prohibited" in adj_neg.json()["detail"]

    # 4. Mandatory reason requirement
    adj_no_reason = client.post(
        "/api/v1/inventory/adjust",
        headers=admin_headers,
        json={
            "product_id": p_id,
            "adjustment_type": "INCREASE",
            "quantity": 5,
            "reason": ""
        }
    )
    assert adj_no_reason.status_code == 422 or adj_no_reason.status_code == 400

    # 5. Direct Stock Receive
    rec = client.post(
        "/api/v1/inventory/receive",
        headers=admin_headers,
        json={
            "product_id": p_id,
            "quantity": 8,
            "reference": "BATCH-902",
            "notes": "Direct supplier arrival"
        }
    )
    assert rec.status_code == 201
    assert rec.json()["quantity_after"] == 20
