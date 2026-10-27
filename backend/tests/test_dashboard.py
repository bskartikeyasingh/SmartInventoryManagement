def test_dashboard_and_reports_endpoints(client, admin_headers):
    # 1. Summary
    summ_resp = client.get("/api/v1/dashboard/summary", headers=admin_headers)
    assert summ_resp.status_code == 200
    summ = summ_resp.json()
    assert "total_active_products" in summ
    assert "total_units_in_stock" in summ
    assert "total_inventory_cost" in summ
    assert "low_stock_count" in summ
    assert "out_of_stock_count" in summ

    # 2. Sales Trend
    trend_resp = client.get("/api/v1/dashboard/sales-trend?months=6", headers=admin_headers)
    assert trend_resp.status_code == 200
    assert len(trend_resp.json()) == 6

    # 3. Stock Distribution
    dist_resp = client.get("/api/v1/dashboard/stock-distribution", headers=admin_headers)
    assert dist_resp.status_code == 200
    assert isinstance(dist_resp.json(), list)

    # 4. Reports Inventory Valuation
    val_resp = client.get("/api/v1/reports/inventory", headers=admin_headers)
    assert val_resp.status_code == 200
    assert isinstance(val_resp.json(), list)

    # 5. CSV Export
    csv_resp = client.get("/api/v1/reports/export?report_type=inventory", headers=admin_headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")
    assert "SKU,Product Name,Category" in csv_resp.text
