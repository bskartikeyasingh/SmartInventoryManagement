def test_category_and_product_workflow(client, admin_headers):
    # 1. Create Category
    cat_resp = client.post(
        "/api/v1/categories",
        headers=admin_headers,
        json={"name": "Audio", "description": "Audio devices and speakers"}
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["id"]

    # 2. Duplicate Category rejected
    dup_cat = client.post(
        "/api/v1/categories",
        headers=admin_headers,
        json={"name": "audio"}
    )
    assert dup_cat.status_code == 409

    # 3. Create Product with initial opening quantity
    prod_resp = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "SKU-TEST-101",
            "name": "Studio Earbuds",
            "description": "High fidelity in-ear monitors",
            "category_id": cat_id,
            "unit": "pcs",
            "cost_price": "25.00",
            "selling_price": "59.99",
            "opening_quantity": 40,
            "reorder_level": 15
        }
    )
    assert prod_resp.status_code == 201
    prod_data = prod_resp.json()
    assert prod_data["sku"] == "SKU-TEST-101"
    assert prod_data["quantity"] == 40
    assert prod_data["stock_status"] == "IN_STOCK"
    prod_id = prod_data["id"]

    # 4. Duplicate SKU rejected
    dup_prod = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "sku-test-101",
            "name": "Another Earbud",
            "category_id": cat_id,
            "cost_price": "10.00",
            "selling_price": "20.00",
            "opening_quantity": 5,
            "reorder_level": 2
        }
    )
    assert dup_prod.status_code == 409

    # 5. Verify opening stock movement created
    mov_resp = client.get(f"/api/v1/inventory/movements?product_id={prod_id}", headers=admin_headers)
    assert mov_resp.status_code == 200
    movements = mov_resp.json()["items"]
    assert len(movements) >= 1
    assert movements[0]["movement_type"] == "OPENING_STOCK"
    assert movements[0]["quantity_change"] == 40

    # 6. Product update does not alter quantity
    upd_resp = client.patch(
        f"/api/v1/products/{prod_id}",
        headers=admin_headers,
        json={"name": "Studio Earbuds Pro", "selling_price": "64.99"}
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["name"] == "Studio Earbuds Pro"
    assert upd_resp.json()["quantity"] == 40
