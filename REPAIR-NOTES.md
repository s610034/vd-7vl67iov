# Wazuh / PVE 部署修正

更新 index.html 後必須重新產生部署 ZIP；不會自動修復已部署 VM。現有環境請先備份及確認實際帳密、CA、版本與磁碟配置，再套用必要修改。

## 已修正

- Dashboard API 指向 Manager Master 55000，API 密碼明確輸入，與 Indexer 帳密分開。
- 正式 ossec.conf 的 cluster 區塊會備份、去重、替換並重啟 Manager；保留其他設定。
- 憑證從官方 wazuh-certificates 子目錄複製；檢查完整節點憑證與金鑰，DN 與官方 Wazuh 預設一致，server 指定 master/worker 類型。
- Dashboard 憑證與設定檔指定服務帳號擁有權及權限。
- 使用正確 indexer-security-init.sh，僅在回應明確表示尚未初始化時初始化；以官方密碼工具同步 admin/kibanaserver，驗證同步結果。Dashboard 服務改用獨立 kibanaserver 密碼。
- Indexer 資料路徑改為 /var/lib/wazuh-indexer；不再每次移除 Filebeat 套件或清空 registry。
- PVE 移除離線磁碟注入。改用 Cloud-Init，預先檢查所有 VM ID、停止狀態與 Cloud-Init 磁碟，不會強制關機、掛載磁碟或自動開機。
- 移除沒有對應 Manager listener 的 514 轉送；保留 Agent 1514、註冊 1515 與 API 55000。
- SOP 統一使用 Ansible 完成安裝；AIO 使用官方安裝器的實際密碼。

## 檢查

需要 Node.js、Python 3，以及 Bash（Cloud-Init 模擬測試）。

```text
python -m pip install -r tests/requirements.txt
node tests/generator.cjs
python tests/merge.py
python tests/templates.py
bash tests/cloudinit.sh
```

已通過 JavaScript 語法、產生的角色 YAML、Jinja/API 密碼往返、XML 合併與備份/重跑、LB 路由、缺少 Worker 驗收失敗，以及 Cloud-Init 模擬測試。模擬測試確認執行中 VM 在修改前被拒絕，停止的 VM 使用 qm 設定。

## 尚需現場驗證

尚未完成真實 Wazuh/PVE 部署、故障切換或效能測試，不能宣稱整套環境已驗收。PVE VM 與磁碟需先建立；資料碟不會自動格式化。跨 PVE 節點請分別準備 VM。NIDS 必須另外設定鏡像/SPAN 流量。

既有叢集必須保留原 CA；新增節點需用同一 CA 補發憑證。套件仍使用 4.x stable 通道，而 Filebeat 模組/索引範本使用固定版本；正式部署前需確認所選 Wazuh 小版本相容。單 Master/Dashboard/LB 仍有單點；Indexer 建議三節點維持多數決。

官方參考：
- https://documentation.wazuh.com/current/installation-guide/wazuh-indexer/step-by-step.html
- https://documentation.wazuh.com/current/installation-guide/wazuh-dashboard/step-by-step.html
- https://documentation.wazuh.com/current/user-manual/user-administration/password-management.html
- https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_cloud_init
