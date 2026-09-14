# Wazuh 部署設定修正

基準版本：6a495572ce2475a116b033394e862750d54ceebe。

## 使用方式

用新版 index.html 取代原檔並重新產生部署 ZIP。新增的 API 密碼欄位須填入 Manager 現有的 wazuh-wui 密碼，與 Indexer admin 密碼不同；產生器不會替你更改 Manager 的密碼。All-in-One 模式不需要填此欄。

這次修改不會自動修復已部署的 VM，也不會更新以前下載的 ZIP。現有環境應先備份，再套用必要設定；不要為了修正 cluster 而直接重跑完整安裝，原有安裝流程還會重設 Filebeat registry。

## 修正內容

- Dashboard API 固定連 Manager Master 的 55000；Agent 仍依 LB 數量選擇 Master、單台 LB 或 VIP。
- API 密碼改為明確輸入，並處理 YAML 中的引號及特殊字元。
- Ansible 與 PVE 都會備份正式 ossec.conf，移除重複 cluster，保留其他設定，再寫入一份正確區塊。無效 XML 或空白 Master 位址會停止寫入。
- Ansible 設定變更會通知並立即執行 Manager 重啟；重跑合併器不會重複追加。
- PVE 補上 Dashboard wazuh.yml 與檔案權限；HAProxy 補上 1515、55000，並使用 wildcard listener，避免備援 LB 尚未持有 VIP 時無法綁定。
- 移除 cluster 範本中未列於官方設定參考的 interval，統一叢集名稱。
- 手動 SOP 改為替換既有 cluster，禁止追加重複區塊。
- 驗收增加 Dashboard 到 Master 的 API 認證及預期 Manager 成員檢查。
- 阻擋未填完整的主機、重複名稱、無效 IPv4、無效 cluster key；保留空 inventory 群組，支援單 Master／無 LB。

## 測試

需要 Node.js 及 Python 3。測試使用合成資料，不會連線或部署至伺服器。

```text
python -m pip install -r tests/requirements.txt
node tests/generator.cjs
python tests/merge.py
python tests/templates.py
```

測試涵蓋無／單／雙 LB、Master 與 Worker 範本、密碼特殊字元、YAML/Jinja、cluster 去重、保留原設定、備份、重跑不變、拒絕損壞 XML，以及缺少 Worker 時驗收失敗。

另外已檢查三支產生的 PVE 腳本 Bash 語法。尚未在實際 Wazuh／PVE 主機執行完整部署；網路、防火牆、既有帳密及套版狀態仍需現場驗收。
