def test_purchase_order_full_workflow(client, admin_headers):
    # Setup supplier & category & product
    sup = client.post(
        "/api/v1/suppliers",
        headers=admin_headers,
        json={"business_name": "Acme Electronics", "email": "sales@acme.com"}
    ).json()

    cat = client.post("/api/v1/categories", headers=admin_headers, json={"name": "PO Cat"}).json()
    prod = client.post(
        "/api/v1/products",
        headers=admin_headers,
        json={
            "sku": "SKU-PO-ITEM",
            "name": "Component A",
            "category_id": cat["id"],
            "cost_price": "15.00",
            "selling_price": "30.00",
            "opening_quantity": 5,
            "reorder_level": 10
        }
    ).json()
    p_id = prod["id"]

    # 1. Create Purchase Order (DRAFT)
    po_resp = client.post(
        "/api/v1/purchases",
        headers=admin_headers,
        json={
            "supplier_id": sup["id"],
            "notes": "Urgent restock",
            "items": [
                {"product_id": p_id, "ordered_quantity": 20, "unit_cost": "15.00"}
            ]
        }
    )
    assert po_resp.status_code == 201
    po = po_resp.json()
    assert po["status"] == "DRAFT"
    assert po["total_amount"] == 300.0 or po["total_amount"] == "300.00"
    po_id = po["id"]
    po_item_id = po["items"][0]["id"]

    # 2. Place Order (DRAFT -> ORDERED)
    ord_resp = client.post(f"/api/v1/purchases/{po_id}/order", headers=admin_headers)
    assert ord_resp.status_code == 200
    assert ord_resp.json()["status"] == "ORDERED"

    # 3. Reject over-receipt
    over_resp = client.post(
        f"/api/v1/purchases/{po_id}/receipts",
        headers=admin_headers,
        json={
            "items": [{"purchase_item_id": po_item_id, "quantity_received": 25}]
        }
    )
    assert over_resp.status_code == 400
    assert "Over-receipt rejected" in over_resp.json()["detail"]

    # 4. Partial Receipt (12 units)
    rec1_resp = client.post(
        f"/api/v1/purchases/{po_id}/receipts",
        headers=admin_headers,
        json={
            "reference_number": "BOL-001",
            "items": [{"purchase_item_id": po_item_id, "quantity_received": 12}]
        }
    )
    assert rec1_resp.status_code == 200
    assert rec1_resp.json()["status"] == "PARTIALLY_RECEIVED"

    # Verify product stock increased by 12 (5 initial + 12 = 17)
    prod_check = client.get(f"/api/v1/products/{p_id}", headers=admin_headers).json()
    assert prod_check["quantity"] == 17

    # 5. Remaining Receipt (8 units) -> Status becomes RECEIVED
    rec2_resp = client.post(
        f"/api/v1/purchases/{po_id}/receipts",
        headers=admin_headers,
        json={
            "reference_number": "BOL-002",
            "items": [{"purchase_item_id": po_item_id, "quantity_received": 8}]
        }
    )
    assert rec2_resp.status_code == 200
    assert rec2_resp.json()["status"] == "RECEIVED"

    # Verify final stock is 25
    prod_final = client.get(f"/api/v1/products/{p_id}", headers=admin_headers).json()
    assert prod_final["quantity"] == 25
