(function () {

    // ===== 获取 MediaWiki 内容容器 =====
    const root =
        document.querySelector("#mw-content-text")
        || document.querySelector("#mw-content");

    if (!root) return;
    root.innerHTML = "";
    // ===== 隐藏 MediaWiki 自带的顶部操作链接 =====
    const headerLinks = document.querySelector("#mw-page-header-links");
    if (headerLinks) {
        headerLinks.style.display = "none";
    }
    // =========================
    // STYLE 样式注入
    // =========================
    const style = document.createElement("style");
    style.textContent = `
    #arxiv-app{ font-family: Arial, sans-serif; padding: 10px; }
    
    /* 维度区块样式 */
    .dimension-block { margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 15px; }
    .dimension-title { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .selected-count { font-size: 12px; color: #36c; background: #e6f0ff; padding: 2px 6px; border-radius: 10px; font-weight: normal; }

    /* 标签样式 - 新增 position: relative 和 margin 调整 */
    .cat-tag{ position: relative; display: inline-block; margin: 8px 12px 8px 4px; padding: 5px 10px; border: 1px solid #999; border-radius: 12px; cursor: pointer; user-select: none; transition: 0.2s; font-size: 13px;}
    .cat-tag:hover{ background: #f5f5f5; }
    .cat-tag.selected{ background: #36c; color: white; border-color: #36c; }
    
    /* 右上角数量角标样式 */
    .tag-badge {
        position: absolute;
        top: -6px;
        right: -10px;
        background: #666;
        color: #fff;
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 8px;
        line-height: 1;
        font-weight: normal;
        pointer-events: none; /* 避免数字干扰标签的点击事件 */
        transition: 0.2s;
    }
    /* 选中标签时，角标颜色也跟着改变（可选，视觉更协调） */
    .cat-tag.selected .tag-badge {
        background: #ff9900;
        color: #fff;
    }
    
    /* 全局操作区 */
    .action-bar { margin-top: 15px; display: flex; gap: 10px; align-items: center; }
    #search-btn{ padding: 10px 20px; cursor: pointer; background: #36c; color: white; border: none; border-radius: 4px; font-weight: bold; }
    #search-btn:hover { background: #2a52be; }
    #clear-btn{ padding: 10px 20px; cursor: pointer; background: #fff; color: #666; border: 1px solid #ccc; border-radius: 4px; }
    #clear-btn:hover { background: #eee; }

    /* 论文卡片样式 */
    #result-box{ margin-top: 20px; }
    .paper { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .paper-id{ color: #666; font-size: 13px; }
    .paper-title{ font-size: 18px; font-weight: bold; margin-top: 6px; }
    .paper-title a { color: #36c; text-decoration: none; }
    .paper-title a:hover { text-decoration: underline; }
    .paper-intro{ margin-top: 8px; line-height: 1.5; color: #333; background: #f9f9f9; padding: 8px; border-left: 3px solid #36c; }
    
    /* 卡片内部标签展示 */
    .paper-tags-group { margin-top: 6px; font-size: 12px; color: #666; }
    .paper-tags span{ display: inline-block; margin: 2px; padding: 2px 8px; background: #eee; border-radius: 10px; font-size: 12px; color: #555; }
    `;
    document.head.appendChild(style);

    // =========================
    // 配置与数据结构
    // =========================
    const DIMENSIONS = {
        research_tags: { label: "研究内容", field: "research_tags" },
        ml_tags: { label: "AI/ML 方法", field: "ml_tags" },
        source_categories: { label: "arXiv 分类", field: "source_categories" }
    };

    // 数据池
    const tagsData = { research_tags: [], ml_tags: [], source_categories: [] };

    // 独立的已选中集合
    const selectedData = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };

    const countCache = new Map(); // 缓存计数 key: "field:tag"

    // =========================
    // UI 节点创建
    // =========================
    const app = document.createElement("div");
    app.id = "arxiv-app";
    root.appendChild(app);

    // 平铺存放各维度区域的容器
    const filterContainer = document.createElement("div");
    filterContainer.id = "filter-container";
    app.appendChild(filterContainer);

    // 操作按钮区
    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";
    app.appendChild(actionBar);

    const searchBtn = document.createElement("button");
    searchBtn.id = "search-btn";
    searchBtn.textContent = "筛选论文";
    actionBar.appendChild(searchBtn);

    const clearBtn = document.createElement("button");
    clearBtn.id = "clear-btn";
    clearBtn.textContent = "重置所有选中";
    actionBar.appendChild(clearBtn);

    const resultBox = document.createElement("div");
    resultBox.id = "result-box";
    app.appendChild(resultBox);

    // =========================
    // Cargo COUNT 查询
    // =========================
    async function getTagCount(field, tag) {
        const cacheKey = `${field}:${tag}`;
        if (countCache.has(cacheKey)) return countCache.get(cacheKey);

        const where = `${field} HOLDS "${tag}"`;
        const params = new URLSearchParams({
            action: "cargoquery",
            tables: "arxiv_papers",
            fields: field, 
            where: where,
            format: "json",
            origin: "*" 
        });
        
        const url = mw.util.wikiScript("api") + "?" + params.toString();

        try {
            const res = await fetch(url);
            const data = await res.json();
            const count = data?.cargoquery?.length || 0;
            countCache.set(cacheKey, count);
            return count;
        } catch (e) {
            return 0;
        }
    }

    // =========================
    // 加载全量维度数据
    // =========================
    async function loadAllTagsFromCargo() {
        resultBox.innerHTML = "正在初始化加载全量多维度标签数据...";
        
        const fieldsStr = Object.keys(DIMENSIONS).map(k => DIMENSIONS[k].field).join(",");
        const params = new URLSearchParams({
            action: "cargoquery",
            tables: "arxiv_papers",
            fields: fieldsStr,
            limit: 1000, 
            format: "json"
        });

        const url = mw.util.wikiScript("api") + "?" + params.toString();

        try {
            const res = await fetch(url);
            const data = await res.json();
            const rawRows = data?.cargoquery || [];
            
            const sets = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };

            rawRows.forEach(row => {
                const item = row.title || {};
                Object.keys(DIMENSIONS).forEach(key => {
                    const fieldName = DIMENSIONS[key].field;
                    const _fieldName = fieldName.replace(/_/g, ' ');
                    const valStr = item[_fieldName] || "";
                    valStr.split(/[,，、]/).forEach(t => {
                        const trimmed = t.trim();
                        if (trimmed) sets[key].add(trimmed);
                    });
                });
            });

            Object.keys(DIMENSIONS).forEach(key => {
                tagsData[key] = Array.from(sets[key]).sort();
            });

            resultBox.innerHTML = "标签数据加载完毕，请在上方选择标签进行文章筛选。";
            renderAllDimensions();
        } catch (e) {
            console.error(e);
            resultBox.innerHTML = "从 Cargo 初始化加载标签集失败。";
        }
    }

    // =========================
    // 渲染所有平铺的维度面板
    // =========================
    function renderAllDimensions() {
        filterContainer.innerHTML = "";

        Object.keys(DIMENSIONS).forEach(key => {
            const dimConfig = DIMENSIONS[key];
            const list = tagsData[key] || [];
            const selectSet = selectedData[key];
            const fieldName = dimConfig.field;

            const block = document.createElement("div");
            block.className = "dimension-block";

            const titleEl = document.createElement("div");
            titleEl.className = "dimension-title";
            titleEl.innerHTML = `${dimConfig.label} ${selectSet.size > 0 ? `<span class="selected-count">已选 ${selectSet.size}</span>` : ''}`;
            block.appendChild(titleEl);

            const tagsWrapper = document.createElement("div");

            if (list.length === 0) {
                tagsWrapper.innerHTML = `<span style="color:#999; font-size:12px;">暂无标签数据</span>`;
            } else {
                list.forEach(tag => {
                    const el = document.createElement("span");
                    el.className = "cat-tag";
                    if (selectSet.has(tag)) el.classList.add("selected");
                    el.textContent = tag;

                    // 创建右上角数量角标，并默认显示 '...' 表示正在加载
                    const badge = document.createElement("span");
                    badge.className = "tag-badge";
                    badge.textContent = "...";
                    el.appendChild(badge);

                    // 异步获取数量并更新角标（配合缓存机制，不会造成重复请求）
                    getTagCount(fieldName, tag).then(count => {
                        badge.textContent = count;
                    });

                    el.onclick = () => {
                        if (selectSet.has(tag)) {
                            selectSet.delete(tag);
                        } else {
                            selectSet.add(tag);
                        }
                        renderAllDimensions(); 
                    };

                    tagsWrapper.appendChild(el);
                });
            }

            block.appendChild(tagsWrapper);
            filterContainer.appendChild(block);
        });
    }

    // =========================
    // 全局 AND 联合搜索
    // =========================
    async function searchPapers() {
        resultBox.innerHTML = "Searching...";

        const allConditions = [];

        Object.keys(DIMENSIONS).forEach(key => {
            const fieldName = DIMENSIONS[key].field;
            const selectedSet = selectedData[key];

            if (selectedSet.size > 0) {
                const subCond = Array.from(selectedSet)
                    .map(t => `${fieldName} HOLDS "${t}"`)
                    .join(" AND ");
                
                allConditions.push(`(${subCond})`);
            }
        });

        if (allConditions.length === 0) {
            resultBox.innerHTML = "请在任意维度中勾选至少一个标签进行搜索。";
            return;
        }

        const where = allConditions.join(" AND ");
        const fieldsToFetch = "arxiv_id,title,url,comment,research_tags,ml_tags,category,source_categories,published_date";

        const params = new URLSearchParams({
            action: "cargoquery",
            tables: "arxiv_papers",
            fields: fieldsToFetch,
            where: where,
            order_by: "published_date DESC",
            limit: 50,
            format: "json"
        });

        const url = mw.util.wikiScript("api") + "?" + params.toString();
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            renderResults(data);
        } catch (e) {
            console.error(e);
            resultBox.innerHTML = "联合检索失败。";
        }
    }
	// // =========================
 //   // 渲染论文结果
 //   // =========================
 //   function renderResults(data) {
 //       resultBox.innerHTML = "";
 //       const papersList = data?.cargoquery;

 //       if (!papersList || papersList.length === 0) {
 //           resultBox.innerHTML = "未找到完全满足所有标签交集条件的论文。";
 //           return;
 //       }

 //       papersList.forEach(row => {
 //           const p = row.title;
 //           const card = document.createElement("div");
 //           card.className = "paper";

 //           const makeSpans = (str) => {
 //               if(!str) return "";
 //               return str.split(/[,，、]/).filter(Boolean).map(t => `<span>${t.trim()}</span>`).join("");
 //           };

 //           // 1. 获取安全的 arXiv ID 文本
 //           const arxivId = p.arxiv_id || "";
 //           // 2. 获取 arXiv 外部原始链接
 //           const externalUrl = p.url || "#";
 //           // 3. 生成 MediaWiki 内部网页链接（以 ID 号作为页面标题）
 //           const wikiInternalUrl = typeof mw !== 'undefined' && mw.util ? mw.util.getUrl(arxivId) : `/wiki/${encodeURIComponent(arxivId)}`;

 //           card.innerHTML = `
 //               <div class="paper-id">
 //                   <strong>arXiv ID:</strong> <a href="${externalUrl}" target="_blank" style="color: #36c; text-decoration: none;">${arxivId}</a> | <strong>Published:</strong> ${p.published_date || ""}
 //               </div>
 //               <div class="paper-title">
 //                   <a href="${wikiInternalUrl}">${p.title || ""}</a>
 //               </div>
 //               <div class="paper-intro">
 //                   <strong>LLM评述：</strong>${p.comment || "暂无评述"}
 //               </div>
                
 //               <div class="paper-tags-group">
 //                   ${ p.research_tags ? `<div><strong>研究标签:</strong> <span class="paper-tags">${makeSpans(p.research_tags)}</span></div>` : "" }
 //                   ${ p.ml_tags ? `<div><strong>AI/ML 方法:</strong> <span class="paper-tags">${makeSpans(p.ml_tags)}</span></div>` : "" }
 //                   ${ p.source_categories ? `<div><strong>arXiv 分类:</strong> <span class="paper-tags">${makeSpans(p.source_categories)}</span></div>` : "" }
 //               </div>
 //           `;
 //           resultBox.appendChild(card);
 //       });
 //   }
    // =========================
    // 渲染论文结果
    // =========================
    function renderResults(data) {
        resultBox.innerHTML = "";
        const papersList = data?.cargoquery;

        if (!papersList || papersList.length === 0) {
            resultBox.innerHTML = "未找到完全满足所有标签交集条件的论文。";
            return;
        }

        papersList.forEach(row => {
            const p = row.title;
            const card = document.createElement("div");
            card.className = "paper";

            const makeSpans = (str) => {
                if(!str) return "";
                return str.split(/[,，、]/).filter(Boolean).map(t => `<span>${t.trim()}</span>`).join("");
            };
			
			const arxivId = p["arxiv id"] || "";
			const wikiInternalUrl = typeof mw !== 'undefined' && mw.util ? mw.util.getUrl(arxivId) : `/wiki/${encodeURIComponent(arxivId)}`;
			
            card.innerHTML = `
                <div class="paper-id">
                	<strong>arXiv ID:</strong> <a href="${p.url}" target="_blank" style="color: #36c; text-decoration: none;">${arxivId}</a> | <strong>Published:</strong> ${p["published date"] || ""}
                </div>
                <div class="paper-title">
                    <a href="${wikiInternalUrl}" target="_blank">${p.title || ""}</a>
                </div>
                <div class="paper-intro">
                    <strong>LLM评述：</strong>${p.comment || "暂无评述"}
                </div>
                
                <div class="paper-tags-group">
                    ${ p.research_tags ? `<div><strong>研究标签:</strong> <span class="paper-tags">${makeSpans(p.research_tags)}</span></div>` : "" }
                    ${ p.ml_tags ? `<div><strong>AI/ML 方法:</strong> <span class="paper-tags">${makeSpans(p.ml_tags)}</span></div>` : "" }
                    ${ p.source_categories ? `<div><strong>arXiv 分类:</strong> <span class="paper-tags">${makeSpans(p.source_categories)}</span></div>` : "" }
                </div>
            `;
            resultBox.appendChild(card);
        });
    }

    // =========================
    // 初始化与重置事件
    // =========================
    searchBtn.onclick = searchPapers;
    
    clearBtn.onclick = () => {
        Object.keys(selectedData).forEach(key => selectedData[key].clear());
        renderAllDimensions();
        resultBox.innerHTML = "所有选定标签已清空。";
    };

    loadAllTagsFromCargo();

})();
