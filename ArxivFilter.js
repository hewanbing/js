(function () {

    // ===== 获取 MediaWiki 内容容器 =====
    const root = document.querySelector("#mw-content-text") || document.querySelector("#mw-content");
    if (!root) return;
    root.innerHTML = "";

    // ===== 隐藏 MediaWiki 自带的顶部操作链接 =====
    const headerLinks = document.querySelector("#mw-page-header-links");
    if (headerLinks) { headerLinks.style.display = "none"; }

    // ==========================================
    // STYLE 样式注入 (支持手动拖拽改变宽高度)
    // ==========================================
    const style = document.createElement("style");
    style.textContent = `
    #arxiv-app { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
        padding: 15px; 
        display: flex; 
        gap: 0px; 
        align-items: start; 
        background-color: #f8fafc;
        min-height: calc(100vh - 40px);
        position: relative;
    }
    
    /* 左侧固定侧边栏 */
    #arxiv-sidebar {
        width: 320px; 
        min-width: 260px; 
        max-width: 550px; 
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        position: sticky;
        top: 20px; 
        max-height: calc(100vh - 60px);
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        box-sizing: border-box;
        flex-shrink: 0;
    }

    /* 左右分割线拖拽条 */
    .resizer {
        width: 14px;
        cursor: col-resize;
        align-self: stretch;
        position: sticky;
        top: 20px;
        height: calc(100vh - 60px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        user-select: none;
    }
    .resizer::after {
        content: "";
        width: 2px;
        height: 40px;
        background: #cbd5e1;
        border-radius: 2px;
        transition: background 0.15s;
    }
    .resizer:hover::after, .resizer.dragging::after {
        background: #2563eb;
        width: 4px;
        height: 60px;
    }

    /* 右侧滚动主内容区 */
    #arxiv-main {
        flex: 1;
        min-width: 0; 
        display: flex;
        flex-direction: column;
    }

    /* 侧边栏置顶的操作区 */
    .action-bar { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    #search-btn { width: 100%; padding: 8px 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; transition: background 0.15s; }
    #search-btn:hover { background: #1d4ed8; }
    
    .bottom-buttons { display: flex; gap: 8px; }
    #clear-btn { flex: 1; padding: 8px; cursor: pointer; background: #fff; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
    #clear-btn:hover { background: #f8fafc; }
    
    .custom-multiselect { flex: 1; position: relative; }
    .multiselect-select { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; color: #475569; text-align: center; user-select: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
    .multiselect-dropdown { display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 110; min-width: 200px; margin-top: 6px; padding: 6px 0; max-height: 250px; overflow-y: auto;}
    .multiselect-dropdown.show { display: block; }
    .multiselect-option { padding: 6px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #334155;}
    .multiselect-option:hover { background: #f1f5f9; }
    .multiselect-option input { cursor: pointer; margin: 0; }

    /* 顶部实时已选标签面板区域 */
    #active-tags-panel { display: none; padding-top: 10px; border-top: 1px dashed #e2e8f0; margin-top: 4px; }
    #active-tags-panel.has-tags { display: block; }
    .active-tags-title { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
    .active-tags-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 100px; overflow-y: auto; padding-right: 2px; }
    
    .active-tag-item { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; line-height: 1.2; user-select: none; }
    .active-tag-item.research_tags { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .active-tag-item.ml_tags { background: #f5f3ff; color: #5b21b6; border: 1px solid #ddd6fe; }
    .active-tag-item.source_categories { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .active-tag-remove { font-size: 12px; cursor: pointer; color: inherit; opacity: 0.6; font-weight: bold; }
    .active-tag-remove:hover { opacity: 1; }

    /* 类别选择触发器面板 */
    #category-trigger-bar { padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .trigger-title { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;}
    .category-trigger-btn { width: 100%; padding: 10px 12px; font-size: 13px; font-weight: 600; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s; }
    .category-trigger-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
    .category-trigger-btn.active { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
    .trigger-badge { font-size: 11px; background: #2563eb; color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 500; }

    /* 存放展开标签的容器 */
    #filter-container {
        flex: 1;
        overflow: hidden; 
        margin-top: 12px;
        padding: 2px 0;
    }
    
    .dimension-block { display: none; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.01); box-sizing: border-box; }
    .dimension-block.active { display: block; animation: fadeIn 0.2s ease-in-out; }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* 支持用户纵向鼠标拉伸高度 */
    .tags-wrapper { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 6px; 
        height: 450px; 
        min-height: 120px; 
        max-height: 700px;
        overflow-y: auto; 
        padding-right: 4px;
        padding-bottom: 8px;
        resize: vertical; 
        box-sizing: border-box;
    }
    .tags-wrapper::-webkit-scrollbar { width: 4px; }
    .tags-wrapper::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

    /* 大列表标签基础设计 */
    .cat-tag { position: relative; display: inline-block; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; user-select: none; transition: all 0.15s ease; font-size: 12px; color: #334155; background: #fff; white-space: nowrap;}
    .cat-tag:hover { background: #f8fafc; border-color: #94a3b8; }
    .cat-tag.selected { background: #2563eb; color: white; border-color: #2563eb; font-weight: 500; }
    
    /* 右侧卡片区域样式 */
    .top-control-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
    .search-summary { font-size: 14px; color: #64748b; margin: 0; display: flex; align-items: center; }
    .search-summary strong { color: #2563eb; }
    .total-count-span { color: #16a34a; font-weight: bold; }
    
    #result-box { width: 100%; margin: 12px 0; }
    .paper { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: border-color 0.15s; }
    .paper:last-child { margin-bottom: 0; }
    .paper:hover { border-color: #cbd5e1; }
    .paper-id { color: #64748b; font-size: 12px; margin-bottom: 4px; }
    .paper-title { font-size: 17px; font-weight: 700; line-height: 1.4; margin-bottom: 8px; }
    .paper-title a { color: #1e293b; text-decoration: none; }
    .paper-title a:hover { color: #2563eb; }
    
    .paper-meta-line { font-size: 13px; color: #475569; margin-bottom: 6px; }
    .paper-intro { margin-top: 8px; line-height: 1.5; font-size: 13.5px; color: #1e293b; background: #eff6ff; padding: 10px; border-left: 3px solid #2563eb; border-radius: 0 4px 4px 0; }
    .paper-text-block { margin-top: 8px; line-height: 1.5; font-size: 13.5px; padding: 10px; border-left: 3px solid #cbd5e1; background: #f8fafc; border-radius: 0 4px 4px 0; }
    .comment-en-block { border-left-color: #8b5cf6; background: #f5f3ff; color: #4c1d95; }
    .abstract-block { border-left-color: #10b981; background: #ecfdf5; color: #064e3b; }
    
    .paper-tags-group { margin-top: 10px; font-size: 12px; color: #64748b; display: flex; flex-direction: column; gap: 4px; }
    .paper-tags { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-left: 4px; vertical-align: middle; }
    
    /* 令右侧卡片输出的标签也具备手势和高亮交互 */
    .paper-tags span { display: inline-block; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.12s; user-select: none; }
    .paper-tags span:hover { background: #e2e8f0; border-color: #cbd5e1; color: #1e293b; }
    .paper-tags span.selected-active { background: #2563eb; color: #fff; border-color: #2563eb; }
    
    /* 翻页控制条布局 */
    .pagination-bar { display: flex; justify-content: center; align-items: center; gap: 8px; }
    .page-btn { padding: 4px 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; color: #334155; font-weight: 600; }
    .page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .page-btn:disabled { color: #cbd5e1; background: #f1f5f9; cursor: not-allowed; border-color: #e2e8f0; }
    .page-info { font-size: 12px; color: #475569; font-weight: 600; min-width: 60px; text-align: center; }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 配置与数据结构
    // ==========================================
    const DIMENSIONS = {
        research_tags: { label: "Research Tags", field: "research_tags" },
        ml_tags: { label: "AI/ML Algorithms", field: "ml_tags" },
        source_categories: { label: "arXiv Categories", field: "source_categories" }
    };

    let activeDimensionKey = null;

    const DISPLAY_FIELDS = [
        { key: "arxiv_id", label: "arXiv ID", default: true },
        { key: "publish_date", label: "Publish Date", default: true },
        { key: "title", label: "Title", default: true },
        { key: "authors", label: "Authors", default: false },
        { key: "comment_en", label: "LLM Comment", default: true },
        { key: "comment", label: "LLM 评述", default: false },
        { key: "abstract", label: "Abstract", default: false },
        { key: "research_tags", label: "Research Tags", default: true },
        { key: "ml_tags", label: "AI/ML Algorithms", default: true },
        { key: "source_categories", label: "arXiv Categories", default: true }
    ];

    const tagsData = { research_tags: [], ml_tags: [], source_categories: [] };
    const selectedData = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };
    const visibleFields = new Set(DISPLAY_FIELDS.filter(f => f.default).map(f => f.key));

    let currentPage = 1; 
    const pageSize = 50; 
    let lastSearchData = null; 

    // ==========================================
    // 智能切分工具
    // ==========================================
    const splitTagsSmartly = (str) => {
        if (!str) return [];
        const results = [];
        let current = "";
        let depth = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '(' || char === '[' || char === '{') depth++;
            if (char === ')' || char === ']' || char === '}') depth--;

            if (depth === 0 && (char === ',' || char === '，' || char === ';' || char === '；' || char === '、')) {
                if (current.trim()) results.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        if (current.trim()) results.push(current.trim());
        return results;
    };

    // ==========================================
    // UI 节点创建
    // ==========================================
    const app = document.createElement("div");
    app.id = "arxiv-app";
    root.appendChild(app);

    const sidebar = document.createElement("aside");
    sidebar.id = "arxiv-sidebar";
    app.appendChild(sidebar);

    const resizer = document.createElement("div");
    resizer.className = "resizer";
    app.appendChild(resizer);

    const mainContent = document.createElement("main");
    mainContent.id = "arxiv-main";
    app.appendChild(mainContent);

    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";
    sidebar.appendChild(actionBar);

    const searchBtn = document.createElement("button");
    searchBtn.id = "search-btn";
    searchBtn.textContent = "Search Papers";
    actionBar.appendChild(searchBtn);

    const bottomButtons = document.createElement("div");
    bottomButtons.className = "bottom-buttons";
    actionBar.appendChild(bottomButtons);

    const selectWrapper = document.createElement("div");
    selectWrapper.className = "custom-multiselect";

    const selectBox = document.createElement("div");
    selectBox.className = "multiselect-select";
    selectBox.textContent = "Fields";
    selectWrapper.appendChild(selectBox);

    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = "multiselect-dropdown";

    DISPLAY_FIELDS.forEach(field => {
        const option = document.createElement("label");
        option.className = "multiselect-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = field.default;
        
        checkbox.onchange = () => {
            if (checkbox.checked) visibleFields.add(field.key);
            else visibleFields.delete(field.key);
            if(lastSearchData) renderResults(lastSearchData);
        };

        option.appendChild(checkbox);
        option.appendChild(document.createTextNode(field.label));
        dropdownMenu.appendChild(option);
    });
    selectWrapper.appendChild(dropdownMenu);
    
    selectBox.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
    };
    document.addEventListener("click", () => { dropdownMenu.classList.remove("show"); });
    dropdownMenu.onclick = (e) => e.stopPropagation();

    bottomButtons.appendChild(selectWrapper);

    const clearBtn = document.createElement("button");
    clearBtn.id = "clear-btn";
    clearBtn.textContent = "Reset";
    bottomButtons.appendChild(clearBtn);

    const activeTagsPanel = document.createElement("div");
    activeTagsPanel.id = "active-tags-panel";
    const activeTagsTitle = document.createElement("div");
    activeTagsTitle.className = "active-tags-title";
    activeTagsTitle.textContent = "Active Filters";
    const activeTagsList = document.createElement("div");
    activeTagsList.className = "active-tags-list";
    activeTagsPanel.appendChild(activeTagsTitle);
    activeTagsPanel.appendChild(activeTagsList);
    actionBar.appendChild(activeTagsPanel);

    const categoryTriggerBar = document.createElement("div");
    categoryTriggerBar.id = "category-trigger-bar";
    const triggerLabel = document.createElement("div");
    triggerLabel.className = "trigger-title";
    triggerLabel.textContent = "Filter By Categories";
    categoryTriggerBar.appendChild(triggerLabel);
    sidebar.appendChild(categoryTriggerBar);

    const filterContainer = document.createElement("div");
    filterContainer.id = "filter-container";
    sidebar.appendChild(filterContainer);

    const topControlBar = document.createElement("div");
    topControlBar.className = "top-control-bar";
    topControlBar.style.display = "none";
    mainContent.appendChild(topControlBar);

    const summaryDiv = document.createElement("div");
    summaryDiv.className = "search-summary";
    topControlBar.appendChild(summaryDiv);

    const topPaginationBar = document.createElement("div");
    topPaginationBar.className = "pagination-bar";
    topControlBar.appendChild(topPaginationBar);

    const resultBox = document.createElement("div");
    resultBox.id = "result-box";
    mainContent.appendChild(resultBox);

    const bottomPaginationBar = document.createElement("div");
    bottomPaginationBar.className = "pagination-bar";
    mainContent.appendChild(bottomPaginationBar);

    // ==========================================
    // 左右分割线拖拽
    // ==========================================
    (function initSplitPanelResizable() {
        let isDragging = false;
        resizer.addEventListener("mousedown", function (e) {
            e.preventDefault();
            isDragging = true;
            resizer.classList.add("dragging");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mousemove", function (e) {
            if (!isDragging) return;
            const containerLeft = app.getBoundingClientRect().left;
            let targetWidth = e.clientX - containerLeft - 7;
            if (targetWidth < 260) targetWidth = 260;
            if (targetWidth > 550) targetWidth = 550;
            sidebar.style.width = targetWidth + "px";
        });
        document.addEventListener("mouseup", function () {
            if (isDragging) {
                isDragging = false;
                resizer.classList.remove("dragging");
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        });
    })();

    // ==========================================
    // 状态更新与卡片联动高亮
    // ==========================================
    function refreshActiveTagsPanel() {
        activeTagsList.innerHTML = "";
        let totalSelectedCount = 0;

        Object.keys(DIMENSIONS).forEach(dimKey => {
            const selectSet = selectedData[dimKey];
            totalSelectedCount += selectSet.size;

            const triggerBtn = categoryTriggerBar.querySelector(`.category-trigger-btn[data-dim="${dimKey}"]`);
            if (triggerBtn) {
                const existingBadge = triggerBtn.querySelector(".trigger-badge");
                if (existingBadge) existingBadge.remove();
                if (selectSet.size > 0) {
                    const badge = document.createElement("span");
                    badge.className = "trigger-badge";
                    badge.textContent = selectSet.size;
                    triggerBtn.appendChild(badge);
                }
            }

            selectSet.forEach(tag => {
                const tagBadge = document.createElement("span");
                tagBadge.className = `active-tag-item ${dimKey}`;
                tagBadge.textContent = tag;

                const removeCross = document.createElement("span");
                removeCross.className = "active-tag-remove";
                removeCross.innerHTML = "&times;";
                
                removeCross.onclick = (e) => {
                    e.stopPropagation();
                    selectSet.delete(tag);
                    
                    // 同步取消左侧面板的高亮
                    const targetBlock = filterContainer.querySelector(`.dimension-block[data-dim="${dimKey}"]`);
                    if (targetBlock) {
                        const originalTagEl = targetBlock.querySelector(`.cat-tag[data-tag="${tag.replace(/"/g, '\\"')}"]`);
                        if (originalTagEl) originalTagEl.classList.remove("selected");
                    }
                    // 同步取消右侧已有结果卡片的高亮
                    syncRightContentTagsHighlight(dimKey, tag, false);
                    refreshActiveTagsPanel();
                };

                tagBadge.appendChild(removeCross);
                activeTagsList.appendChild(tagBadge);
            });
        });

        activeTagsPanel.classList.toggle("has-tags", totalSelectedCount > 0);
    }

    function syncRightContentTagsHighlight(dimKey, tag, isSelected) {
        const matchingSpans = resultBox.querySelectorAll(`.paper-tags[data-dim="${dimKey}"] span[data-raw-tag="${tag.replace(/"/g, '\\"')}"]`);
        matchingSpans.forEach(span => {
            span.classList.toggle("selected-active", isSelected);
        });
    }

    function renderCategoryTriggersAndPanels() {
        const existingBtns = categoryTriggerBar.querySelectorAll(".category-trigger-btn");
        existingBtns.forEach(b => b.remove());
        filterContainer.innerHTML = "";

        Object.keys(DIMENSIONS).forEach(key => {
            const dimConfig = DIMENSIONS[key];
            const list = tagsData[key] || [];
            const selectSet = selectedData[key];

            const triggerBtn = document.createElement("button");
            triggerBtn.className = "category-trigger-btn";
            triggerBtn.dataset.dim = key;
            triggerBtn.innerHTML = `<span>+ ${dimConfig.label}</span>`;
            categoryTriggerBar.appendChild(triggerBtn);

            const block = document.createElement("div");
            block.className = "dimension-block";
            block.dataset.dim = key;

            const tagsWrapper = document.createElement("div");
            tagsWrapper.className = "tags-wrapper";

            if (list.length === 0) {
                tagsWrapper.innerHTML = `<span style="color:#94a3b8; font-size:12px;">No tags available</span>`;
            } else {
                list.forEach(tag => {
                    const el = document.createElement("span");
                    el.className = `cat-tag${selectSet.has(tag) ? ' selected' : ''}`;
                    el.textContent = tag;
                    el.dataset.tag = tag;
                    tagsWrapper.appendChild(el);
                });
            }
            block.appendChild(tagsWrapper);
            filterContainer.appendChild(block);

            triggerBtn.onclick = () => {
                const isCurrentlyActive = triggerBtn.classList.contains("active");
                categoryTriggerBar.querySelectorAll(".category-trigger-btn").forEach(b => b.classList.remove("active"));
                filterContainer.querySelectorAll(".dimension-block").forEach(d => d.classList.remove("active"));

                if (!isCurrentlyActive) {
                    triggerBtn.classList.add("active");
                    block.classList.add("active");
                    activeDimensionKey = key;
                } else {
                    activeDimensionKey = null; 
                }
            };

            tagsWrapper.onclick = (e) => {
                const tagEl = e.target.closest('.cat-tag');
                if (!tagEl) return;
                e.stopPropagation();

                const targetTag = tagEl.dataset.tag;
                const willSelect = !selectSet.has(targetTag);
                
                if (willSelect) {
                    selectSet.add(targetTag);
                    tagEl.classList.add('selected');
                } else {
                    selectSet.delete(targetTag);
                    tagEl.classList.remove('selected');
                }
                syncRightContentTagsHighlight(key, targetTag, willSelect);
                refreshActiveTagsPanel();
            };
        });

        if (activeDimensionKey) {
            const activeBtn = categoryTriggerBar.querySelector(`.category-trigger-btn[data-dim="${activeDimensionKey}"]`);
            const activeBlock = filterContainer.querySelector(`.dimension-block[data-dim="${activeDimensionKey}"]`);
            if (activeBtn && activeBlock) {
                activeBtn.classList.add("active");
                activeBlock.classList.add("active");
            }
        }
    }

    // ==========================================
    // 异步循环增量式抓取全量去重标签流，避免 Max 500 被隐藏后端截断
    // ==========================================
    async function loadAllTagsFromCargo() {
        resultBox.innerHTML = "<div style='color:#64748b;font-size:14px;'>Loading filters from backend...</div>";
        Object.keys(tagsData).forEach(k => tagsData[k] = []);
        
        try {
            const promises = Object.keys(DIMENSIONS).map(async (key) => {
                const fieldName = DIMENSIONS[key].field;
                let offset = 0;
                let keepFetching = true;
                const accumulatedTags = new Set();

                while (keepFetching) {
                    const params = new URLSearchParams({
                        action: "cargoquery", 
                        tables: `arxiv_papers__${fieldName}`, 
                        fields: "_value=tag_name", 
                        group_by: "_value", 
                        order_by: "_value ASC",
                        limit: "500", 
                        offset: String(offset),
                        format: "json"
                    });

                    const url = mw.util.wikiScript("api") + "?" + params.toString();
                    const res = await fetch(url);
                    const data = await res.json();
                    const rows = data?.cargoquery || [];
                    
                    if (rows.length === 0) {
                        keepFetching = false;
                    } else {
                        rows.forEach(r => {
                            const val = (r.title?.tag_name || "").trim();
                            if (val) accumulatedTags.add(val);
                        });
                        offset += 500;
                        if (rows.length < 500) keepFetching = false;
                    }
                }
                tagsData[key] = Array.from(accumulatedTags).sort();
            });

            await Promise.all(promises);
            resultBox.innerHTML = "<div style='color:#64748b;font-size:14px;font-style:italic;'>Filters loaded successfully. Choose your tags on the left.</div>";
            renderCategoryTriggersAndPanels();
        } catch (e) { 
            console.error(e);
            resultBox.innerHTML = "Failed to initialize tag sets securely."; 
        }
    }

    // ==========================================
    // 结果检索与右侧点击事件委托
    // ==========================================
    async function fetchTotalSearchCount(whereClause, targetElement) {
        const params = new URLSearchParams({
            action: "cargoquery", tables: "arxiv_papers", fields: "COUNT(*)=total_count", where: whereClause, format: "json", origin: "*"
        });
        const url = mw.util.wikiScript("api") + "?" + params.toString();
        try {
            const res = await fetch(url);
            const data = await res.json();
            const total = data?.cargoquery?.[0]?.title?.total_count || 0;
            if (targetElement) targetElement.innerHTML = ` (Total: <span class="total-count-span">${total}</span> papers found)`;
        } catch (e) { console.error(e); }
    }

    async function searchPapers() {
        resultBox.innerHTML = "<div style='color:#64748b;font-size:14px;'>Searching...</div>";
        topControlBar.style.display = "none";
        bottomPaginationBar.innerHTML = ""; 

        const allConditions = [];
        Object.keys(DIMENSIONS).forEach(key => {
            const fieldName = DIMENSIONS[key].field;
            const selectedSet = selectedData[key];
            if (selectedSet.size > 0) {
                const subCond = Array.from(selectedSet).map(t => {
                    const secureTag = t.replace(/\|/g, '&#124;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
                    return `${fieldName} HOLDS "${secureTag}"`;
                }).join(" AND ");
                allConditions.push(`(${subCond})`);
            }
        });

        if (allConditions.length === 0) {
            resultBox.innerHTML = "<div style='color:#64748b;font-size:14px;font-style:italic;'>Select at least one tag to start searching papers.</div>";
            return;
        }

        const where = allConditions.join(" AND ");
        // 【核心修改点】：fields 必须只提供全小写下划线的合法标准字段名称，任何带空格或非法的备用字段会导致整个 API 报 SQL 解析错误
        const fieldsToFetch = "arxiv_id,title,url,authors,abstract,comment,comment_en,research_tags,ml_tags,category,source_categories,published_date";
        const currentOffset = (currentPage - 1) * pageSize;

        const params = new URLSearchParams({
            action: "cargoquery", tables: "arxiv_papers", fields: fieldsToFetch, where: where, order_by: "published_date DESC", limit: String(pageSize + 1), offset: String(currentOffset), format: "json"
        });

        try {
            const res = await fetch(mw.util.wikiScript("api") + "?" + params.toString());
            const data = await res.json();
            lastSearchData = data; 
            renderResults(data);

            const totalCountContainer = document.getElementById("search-total-count");
            if (totalCountContainer) fetchTotalSearchCount(where, totalCountContainer);
        } catch (e) {
            console.error(e);
            resultBox.innerHTML = "Search failed.";
        }
    }

    function createPaginationDOM(targetElement, hasNextPage) {
        targetElement.innerHTML = "";
        const prevBtn = document.createElement("button");
        prevBtn.className = "page-btn"; prevBtn.textContent = "◀ Prev"; prevBtn.disabled = (currentPage === 1);
        prevBtn.onclick = () => { currentPage--; searchPapers(); window.scrollTo({ top: topControlBar.offsetTop - 10, behavior: 'smooth' }); };

        const pageInfo = document.createElement("span");
        pageInfo.className = "page-info"; pageInfo.textContent = `P. ${currentPage}`;

        const nextBtn = document.createElement("button");
        nextBtn.className = "page-btn"; nextBtn.textContent = "Next ▶"; nextBtn.disabled = !hasNextPage;
        nextBtn.onclick = () => { currentPage++; searchPapers(); window.scrollTo({ top: topControlBar.offsetTop - 10, behavior: 'smooth' }); };

        targetElement.appendChild(prevBtn); targetElement.appendChild(pageInfo); targetElement.appendChild(nextBtn);
    }

    function renderResults(data) {
        resultBox.innerHTML = "";
        topPaginationBar.innerHTML = "";
        bottomPaginationBar.innerHTML = "";
        
        let papersList = data?.cargoquery || [];
        if (papersList.length === 0) {
            topControlBar.style.display = "none";
            resultBox.innerHTML = currentPage > 1 ? "No more papers on this page." : "No papers found matching all selected tags.";
            return;
        }

        const hasNextPage = papersList.length > pageSize;
        if (hasNextPage) papersList = papersList.slice(0, pageSize);

        topControlBar.style.display = "flex";
        summaryDiv.innerHTML = `Showing <strong>${papersList.length}</strong> paper${papersList.length > 1 ? 's' : ''} on this page.<span id="search-total-count"> (Calculating...)</span>`;
        
        createPaginationDOM(topPaginationBar, hasNextPage);
        createPaginationDOM(bottomPaginationBar, hasNextPage);

        resultBox.onclick = (e) => {
            const clickedSpan = e.target.closest('.paper-tags span');
            if (!clickedSpan) return;
            
            const parentGroup = clickedSpan.parentElement;
            const dimKey = parentGroup.dataset.dim;
            const targetTag = clickedSpan.dataset.rawTag;
            const selectSet = selectedData[dimKey];
            
            if (selectSet.has(targetTag)) {
                selectSet.delete(targetTag);
                const leftTagEl = filterContainer.querySelector(`.dimension-block[data-dim="${dimKey}"] .cat-tag[data-tag="${targetTag.replace(/"/g, '\\"')}"]`);
                if(leftTagEl) leftTagEl.classList.remove('selected');
            } else {
                selectSet.add(targetTag);
                const leftTagEl = filterContainer.querySelector(`.dimension-block[data-dim="${dimKey}"] .cat-tag[data-tag="${targetTag.replace(/"/g, '\\"')}"]`);
                if(leftTagEl) leftTagEl.classList.add('selected');
            }
            
            syncRightContentTagsHighlight(dimKey, targetTag, selectSet.has(targetTag));
            refreshActiveTagsPanel();
        };

        papersList.forEach(row => {
            const p = row.title;
            if (!p) return;
            const card = document.createElement("div");
            card.className = "paper";

            const makeSpansHTML = (dimKey, str) => {
                if(!str) return "";
                let cleanStr = str.replace(/&#124;/g, '|').replace(/&#123;/g, '{').replace(/&#125;/g, '}');
                const subTags = splitTagsSmartly(cleanStr);
                const selectSet = selectedData[dimKey];
                
                return subTags.map(t => {
                    const trimmed = t.trim();
                    const isActive = selectSet.has(trimmed) ? " class='selected-active'" : "";
                    return `<span data-raw-tag="${trimmed.replace(/"/g, '&quot;')}"${isActive}>${trimmed}</span>`;
                }).join("");
            };
            
            // 数据解析读取时的两阶层向下降级处理（智能向旧数据格式空格映射兼容）
            const arxivId = p["arxiv_id"] || p["arxiv id"] || "";
            const publishedDate = p["published_date"] || p["published date"] || p["publish_date"] || "";
            const research_tags = p["research_tags"] || p["research tags"] || "";
            const ml_tags = p["ml_tags"] || p["ml tags"] || "";
            const source_categories = p["source_categories"] || p["source categories"] || "";
            const commentEn = p["comment_en"] || p["comment en"] || "";
            const abstractText = p["abstract"] || "";
            const authorsList = p["authors"] || "";
            const primaryCategory = p["category"] || "";
            
            const wikiInternalUrl = typeof mw !== 'undefined' && mw.util ? mw.util.getUrl(arxivId) : `/wiki/${encodeURIComponent(arxivId)}`;
            
            let htmlContent = "";

            if (visibleFields.has("arxiv_id") || visibleFields.has("publish_date")) {
                htmlContent += `<div class="paper-id">`;
                if (visibleFields.has("arxiv_id")) htmlContent += `<strong>arXiv ID:</strong> <a href="${p.url || '#'}" target="_blank" style="color: #2563eb; text-decoration: none;">${arxivId}</a>`;
                if (visibleFields.has("arxiv_id") && visibleFields.has("publish_date")) htmlContent += ` | `;
                if (visibleFields.has("publish_date")) htmlContent += `<strong>Published:</strong> ${publishedDate}`;
                htmlContent += `</div>`;
            }

            if (visibleFields.has("title")) {
                let cleanTitle = (p.title || "Untitled").replace(/&#123;/g, '{').replace(/&#125;/g, '}');
                htmlContent += `<div class="paper-title"><a href="${p.url || wikiInternalUrl}" target="_blank">${cleanTitle}</a></div>`;
            }

            if (visibleFields.has("authors") && authorsList) htmlContent += `<div class="paper-meta-line"><strong>Authors:</strong> ${authorsList}</div>`;
            if (visibleFields.has("category") && primaryCategory) htmlContent += `<div class="paper-meta-line"><strong>Primary Category:</strong> ${primaryCategory}</div>`;
            if (visibleFields.has("comment") && p.comment) htmlContent += `<div class="paper-intro"><strong>LLM评述：</strong>${p.comment}</div>`;
            if (visibleFields.has("comment_en") && commentEn) htmlContent += `<div class="paper-text-block comment-en-block"><strong>LLM Comment：</strong>${commentEn}</div>`;

            if (visibleFields.has("abstract") && abstractText) {
                let cleanAbstract = abstractText.replace(/&#123;/g, '{').replace(/&#125;/g, '}');
                htmlContent += `<div class="paper-text-block abstract-block"><strong>Abstract：</strong>${cleanAbstract}</div>`;
            }

            const showResearch = visibleFields.has("research_tags") && research_tags;
            const showML = visibleFields.has("ml_tags") && ml_tags;
            const showSource = visibleFields.has("source_categories") && source_categories;

            if (showResearch || showML || showSource) {
                htmlContent += `<div class="paper-tags-group">`;
                if (showResearch) htmlContent += `<div><strong>Research Tags:</strong> <span class="paper-tags" data-dim="research_tags">${makeSpansHTML("research_tags", research_tags)}</span></div>`;
                if (showML) htmlContent += `<div><strong>AI/ML Algorithms:</strong> <span class="paper-tags" data-dim="ml_tags">${makeSpansHTML("ml_tags", ml_tags)}</span></div>`;
                if (showSource) htmlContent += `<div><strong>arXiv Categories:</strong> <span class="paper-tags" data-dim="source_categories">${makeSpansHTML("source_categories", source_categories)}</span></div>`;
                htmlContent += `</div>`;
            }

            card.innerHTML = htmlContent;
            resultBox.appendChild(card);
        });
    }

    searchBtn.onclick = () => { currentPage = 1; searchPapers(); };
    
    clearBtn.onclick = () => {
        Object.keys(selectedData).forEach(key => selectedData[key].clear());
        activeDimensionKey = null; 
        renderCategoryTriggersAndPanels();
        refreshActiveTagsPanel(); 
        topControlBar.style.display = "none";
        resultBox.innerHTML = "<div style='color:#64748b;font-size:14px;font-style:italic;'>All selected tags cleared.</div>";
        bottomPaginationBar.innerHTML = "";
        lastSearchData = null; currentPage = 1; 
    };

    loadAllTagsFromCargo();

})();
