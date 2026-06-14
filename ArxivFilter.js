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

    /* 标签样式 */
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
        pointer-events: none;
        transition: 0.2s;
    }
    .cat-tag.selected .tag-badge {
        background: #ff9900;
        color: #fff;
    }
    
    /* 全局操作区 */
    .action-bar { margin-top: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    #search-btn{ padding: 10px 20px; cursor: pointer; background: #36c; color: white; border: none; border-radius: 4px; font-weight: bold; }
    #search-btn:hover { background: #2a52be; }
    #clear-btn{ padding: 10px 20px; cursor: pointer; background: #fff; color: #666; border: 1px solid #ccc; border-radius: 4px; }
    #clear-btn:hover { background: #eee; }

    /* 多选下拉框自定义样式 */
    .custom-multiselect { position: relative; display: inline-block; }
    .multiselect-select { padding: 10px 15px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px; user-select: none; min-width: 160px;}
    .multiselect-dropdown { display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); z-index: 100; min-width: 180px; margin-top: 4px; padding: 5px 0;}
    .multiselect-dropdown.show { display: block; }
    .multiselect-option { padding: 8px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #333;}
    .multiselect-option:hover { background: #f5f5f5; }
    .multiselect-option input { cursor: pointer; margin: 0; }

    /* 论文卡片样式 */
    #result-box{ margin-top: 20px; }
    .paper { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .paper-id{ color: #666; font-size: 13px; }
    .paper-title{ font-size: 18px; font-weight: bold; margin-top: 6px; }
    .paper-title a { color: #36c; text-decoration: none; }
    .paper-title a:hover { text-decoration: underline; }
    .paper-intro{ margin-top: 8px; line-height: 1.5; color: #333; background: #f9f9f9; padding: 8px; border-left: 3px solid #36c; }
    
    /* 文本区块基类 */
    .paper-text-block { margin-top: 8px; line-height: 1.5; font-size: 14px; padding: 8px; border-left: 3px solid #ccc; background: #f9f9f9; }
    .comment-block { border-left-color: #36c; }
    .comment-en-block { border-left-color: #6c5ce7; }
    .abstract-block { border-left-color: #00b894; }
    
    /* 卡片内部标签展示 */
    .paper-tags-group { margin-top: 6px; font-size: 12px; color: #666; }
    .paper-tags span{ display: inline-block; margin: 2px; padding: 2px 8px; background: #eee; border-radius: 10px; font-size: 12px; color: #555; }

    /* ===== 分页控件样式 ===== */
    .pagination-bar { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding: 10px 0; }
    .page-btn { padding: 8px 16px; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; color: #333; user-select: none; font-weight: bold; }
    .page-btn:hover:not(:disabled) { background: #36c; color: #fff; border-color: #36c; }
    .page-btn:disabled { color: #bbb; background: #f5f5f5; cursor: not-allowed; border-color: #ddd; }
    .page-info { font-size: 14px; color: #444; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // =========================
    // 配置与数据结构
    // =========================
    const DIMENSIONS = {
        research_tags: { label: "Research Tags", field: "research_tags" },
        ml_tags: { label: "AI/ML Algorithms", field: "ml_tags" },
        source_categories: { label: "arXiv Categories", field: "source_categories" }
    };

    const DISPLAY_FIELDS = [
        { key: "arxiv_id", label: "arXiv ID", default: true },
        { key: "publish_date", label: "Publish Date", default: true },
        { key: "title", label: "Title", default: true },
        { key: "authors", label: "Authors", default: false },
        { key: "comment_en", label: "LLM Comment", default: true },
        { key: "comment", label: "LLM 评述", default: false },
        { key: "abstract", label: "Abstract", default: false },
        { key: "research_tags", label: "Research Tags", default: false },
        { key: "ml_tags", label: "AI/ML Algorithms", default: false },
        { key: "source_categories", label: "arXiv Categories", default: false }
    ];

    // 数据池
    const tagsData = { research_tags: [], ml_tags: [], source_categories: [] };
    // 已选中集合
    const selectedData = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };
    // 勾选需要显示的字段
    const visibleFields = new Set(DISPLAY_FIELDS.filter(f => f.default).map(f => f.key));
    const countCache = new Map(); 

    // ===== 分页控制状态状态量 =====
    let currentPage = 1; 
    const pageSize = 100; // 设定每页 100 篇
    let lastSearchData = null; 

    // =========================
    // UI 节点创建
    // =========================
    const app = document.createElement("div");
    app.id = "arxiv-app";
    root.appendChild(app);

    const filterContainer = document.createElement("div");
    filterContainer.id = "filter-container";
    app.appendChild(filterContainer);

    const actionBar = document.createElement("div");
    actionBar.className = "action-bar";
    app.appendChild(actionBar);

    const searchBtn = document.createElement("button");
    searchBtn.id = "search-btn";
    searchBtn.textContent = "Search Papers";
    actionBar.appendChild(searchBtn);

    // 多选下拉选择框
    const selectWrapper = document.createElement("div");
    selectWrapper.className = "custom-multiselect";

    const selectBox = document.createElement("div");
    selectBox.className = "multiselect-select";
    selectBox.textContent = "Customize Display Fields";
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
            if (checkbox.checked) {
                visibleFields.add(field.key);
            } else {
                visibleFields.delete(field.key);
            }
            if(lastSearchData) {
                renderResults(lastSearchData);
            }
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
    document.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
    });
    dropdownMenu.onclick = (e) => e.stopPropagation();

    actionBar.appendChild(selectWrapper);

    const clearBtn = document.createElement("button");
    clearBtn.id = "clear-btn";
    clearBtn.textContent = "Reset";
    actionBar.appendChild(clearBtn);

    const resultBox = document.createElement("div");
    resultBox.id = "result-box";
    app.appendChild(resultBox);

    // ===== 创建底层分页容器 =====
    const paginationBar = document.createElement("div");
    paginationBar.className = "pagination-bar";
    app.appendChild(paginationBar);

    // =========================
    // Cargo COUNT 查询
    // =========================
    async function getTagCount(field, tag) {
        const cacheKey = `${field}:${tag}`;
        if (countCache.has(cacheKey)) return countCache.get(cacheKey);

        const where = `${field} HOLDS "${tag}"`;
        const params = new URLSearchParams({
            action: "cargoquery", tables: "arxiv_papers", fields: field, 
            where: where, format: "json", origin: "*" 
        });
        
        const url = mw.util.wikiScript("api") + "?" + params.toString();
        try {
            const res = await fetch(url);
            const data = await res.json();
            const count = data?.cargoquery?.length || 0;
            countCache.set(cacheKey, count);
            return count;
        } catch (e) { return 0; }
    }

    // =========================
    // 加载全量维度数据
    // =========================
    // async function loadAllTagsFromCargo() {
    //     resultBox.innerHTML = "正在初始化加载全量多维度标签数据...";
        
    //     const fieldsStr = Object.keys(DIMENSIONS).map(k => DIMENSIONS[k].field).join(",");
    //     const params = new URLSearchParams({
    //         action: "cargoquery", tables: "arxiv_papers", fields: fieldsStr, limit: 1000, format: "json"
    //     });
    //     const url = mw.util.wikiScript("api") + "?" + params.toString();

    //     try {
    //         const res = await fetch(url);
    //         const data = await res.json();
    //         const rawRows = data?.cargoquery || [];
    //         const sets = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };

    //         rawRows.forEach(row => {
    //             const item = row.title || {};
    //             Object.keys(DIMENSIONS).forEach(key => {
    //                 const fieldName = DIMENSIONS[key].field;
    //                 const _fieldName = fieldName.replace(/_/g, ' ');
    //                 const valStr = item[_fieldName] || "";
    //                 valStr.split(/[,，、]/).forEach(t => {
    //                     const trimmed = t.trim();
    //                     if (trimmed) sets[key].add(trimmed);
    //                 });
    //             });
    //         });

    //         Object.keys(DIMENSIONS).forEach(key => { tagsData[key] = Array.from(sets[key]).sort(); });
    //         resultBox.innerHTML = "标签数据加载完毕，请在上方选择标签进行文章筛选。";
    //         renderAllDimensions();
    //     } catch (e) { resultBox.innerHTML = "从 Cargo 初始化加载标签集失败。"; }
    // }
	async function loadAllTagsFromCargo() {
    	resultBox.innerHTML = "Initializing multi-dimensional tags...";
    
    	// 初始化清空
    	const sets = { research_tags: new Set(), ml_tags: new Set(), source_categories: new Set() };

    	try {
        	// 遍历三个维度，分别精确获取该字段在整个数据库里出现过的所有独立标签值
        	for (const key of Object.keys(DIMENSIONS)) {
            	const fieldName = DIMENSIONS[key].field;

            	const params = new URLSearchParams({
                	action: "cargoquery",
                	tables: "arxiv_papers",
                	fields: fieldName,
                	// ====== 核心优化 1：利用 lists 参数让 Cargo 自动将 List 展开成单条独立记录 ======
                	lists: fieldName, 
                	// ====== 核心优化 2：利用 group_by 去重，直接返回唯一的标签名，不拉取冗余文章 ======
                	group_by: fieldName, 
                	limit: 500, // 这时的 500 代表“标签种类数”上限，对于一门学科的标签绰绰有余
                	format: "json"
            	});

            	const url = mw.util.wikiScript("api") + "?" + params.toString();
            	const res = await fetch(url);
            	const data = await res.json();
            	const rawRows = data?.cargoquery || [];

            	rawRows.forEach(row => {
                	const item = row.title || {};
                	// 兼容空格和下划线转换
                	const _fieldName = fieldName.replace(/_/g, ' ');
                	const tagVal = item[_fieldName] || item[fieldName] || "";
                
                	// 再次兜底清洗去重
                	const trimmed = tagVal.trim();
                	if (trimmed) {
                    	sets[key].add(trimmed);
                	}
            	});
        	}

        	// 将全局标签池赋值并排序
        	Object.keys(DIMENSIONS).forEach(key => { 
            	tagsData[key] = Array.from(sets[key]).sort(); 
        	});

        	resultBox.innerHTML = "Tags initialized successfully. Please select tags above to search papers.";
        	renderAllDimensions();

    	} catch (e) { 
        	console.error(e);
        	resultBox.innerHTML = "Failed to initialize tag sets."; 
    	}
	}
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
            titleEl.innerHTML = `${dimConfig.label} ${selectSet.size > 0 ? `<span class="selected-count">${selectSet.size} selected</span>` : ''}`;
            block.appendChild(titleEl);

            const tagsWrapper = document.createElement("div");
            if (list.length === 0) {
                tagsWrapper.innerHTML = `<span style="color:#999; font-size:12px;">No tags available</span>`;
            } else {
                list.forEach(tag => {
                    const el = document.createElement("span");
                    el.className = "cat-tag";
                    if (selectSet.has(tag)) el.classList.add("selected");
                    el.textContent = tag;

                    const badge = document.createElement("span");
                    badge.className = "tag-badge";
                    badge.textContent = "...";
                    el.appendChild(badge);

                    getTagCount(fieldName, tag).then(count => { badge.textContent = count; });

                    el.onclick = () => {
                        if (selectSet.has(tag)) selectSet.delete(tag);
                        else selectSet.add(tag);
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
    // 全局 AND 联合搜索（Cargo 分页支持）
    // =========================
    async function searchPapers() {
        resultBox.innerHTML = "Searching...";
        paginationBar.innerHTML = ""; // 检索期间隐藏分页指示器

        const allConditions = [];
        Object.keys(DIMENSIONS).forEach(key => {
            const fieldName = DIMENSIONS[key].field;
            const selectedSet = selectedData[key];
            if (selectedSet.size > 0) {
                const subCond = Array.from(selectedSet).map(t => `${fieldName} HOLDS "${t}"`).join(" AND ");
                allConditions.push(`(${subCond})`);
            }
        });

        if (allConditions.length === 0) {
            resultBox.innerHTML = "Select at least one tag to start searching papers.";
            return;
        }

        const where = allConditions.join(" AND ");
        const fieldsToFetch = "arxiv_id,title,url,authors,abstract,comment,comment_en,research_tags,ml_tags,category,source_categories,published_date";

        // ===== 核心：根据 currentPage 运算 Cargo 偏移量 =====
        const currentOffset = (currentPage - 1) * pageSize;

        const params = new URLSearchParams({
            action: "cargoquery",
            tables: "arxiv_papers",
            fields: fieldsToFetch,
            where: where,
            order_by: "published_date DESC",
            limit: pageSize + 1,   // 获取 101 条，多出的一条用于判断是否拥有下一页
            offset: currentOffset, // 告诉后端跳过前 N 条记录
            format: "json"
        });

        const url = mw.util.wikiScript("api") + "?" + params.toString();
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            lastSearchData = data; 
            renderResults(data);
        } catch (e) {
            console.error(e);
            resultBox.innerHTML = "Search failed.";
        }
    }

    // =========================
    // 渲染论文结果 与 构建分页控件
    // =========================
    function renderResults(data) {
        resultBox.innerHTML = "";
        paginationBar.innerHTML = "";
        
        let papersList = data?.cargoquery || [];

        if (papersList.length === 0) {
            resultBox.innerHTML = currentPage > 1 ? "No more papers on this page." : "No papers found matching all selected tags.";
            return;
        }

        // 探测下一页状态：如果返回的数组长度等于 101，说明后续还有记录
        const hasNextPage = papersList.length > pageSize;
        if (hasNextPage) {
            // 切掉第 101 条试探项，保持当前页面只输出精确的 100 篇
            papersList = papersList.slice(0, pageSize);
        }

        papersList.forEach(row => {
            const p = row.title;
            const card = document.createElement("div");
            card.className = "paper";

            const makeSpans = (str) => {
                if(!str) return "";
                return str.split(/[,，、]/).filter(Boolean).map(t => `<span>${t.trim()}</span>`).join("");
            };
            
            const arxivId = p["arxiv id"] || p["arxiv_id"] || "";
            const publishedDate = p["published date"] || p["published_date"] || "";
            const research_tags = p["research tags"] || p["research_tags"] || "";
            const ml_tags = p["ml tags"] || p["ml_tags"] || "";
            const source_categories = p["source categories"] || p["source_categories"] || "";
            const commentEn = p["comment en"] || p["comment_en"] || "";
            const abstractText = p["abstract"] || "";
            const authorsList = p["authors"] || "";
            const primaryCategory = p["category"] || "";
            
            const wikiInternalUrl = typeof mw !== 'undefined' && mw.util ? mw.util.getUrl(arxivId) : `/wiki/${encodeURIComponent(arxivId)}`;
            
            let htmlContent = "";

            // 1. arXiv ID 与日期 区块
            if (visibleFields.has("arxiv_id") || visibleFields.has("publish_date")) {
                htmlContent += `<div class="paper-id">`;
                if (visibleFields.has("arxiv_id")) {
                    htmlContent += `<strong>arXiv ID:</strong> <a href="${p.url || '#'}" target="_blank" style="color: #36c; text-decoration: none;">${arxivId}</a>`;
                }
                if (visibleFields.has("arxiv_id") && visibleFields.has("publish_date")) {
                    htmlContent += ` | `;
                }
                if (visibleFields.has("publish_date")) {
                    htmlContent += `<strong>Published:</strong> ${publishedDate}`;
                }
                htmlContent += `</div>`;
            }

            // 2. Title 区块
            if (visibleFields.has("title")) {
                htmlContent += `
                <div class="paper-title">
                    <a href="${visibleFields.has("url") ? (p.url || wikiInternalUrl) : wikiInternalUrl}" target="_blank">${p.title || "Untitled"}</a>
                </div>`;
            }

            // 2.5 作者与主分类区块
            if (visibleFields.has("authors") && authorsList) {
                htmlContent += `<div class="paper-meta-line"><strong>Authors:</strong> ${authorsList}</div>`;
            }
            if (visibleFields.has("category") && primaryCategory) {
                htmlContent += `<div class="paper-meta-line"><strong>Primary Category:</strong> ${primaryCategory}</div>`;
            }

            // 3. 中文 LLM 评述区块
            if (visibleFields.has("comment") && p.comment) {
                htmlContent += `
                <div class="paper-intro">
                    <strong>LLM评述：</strong>${p.comment}
                </div>`;
            }
            
            // 4. 英文 LLM 评述
            if (visibleFields.has("comment_en") && commentEn) {
                htmlContent += `
                <div class="paper-text-block comment-en-block">
                    <strong>LLM Comment (EN)：</strong>${commentEn}
                </div>`;
            }

            // 5. 文章摘要 (Abstract)
            if (visibleFields.has("abstract") && abstractText) {
                htmlContent += `
                <div class="paper-text-block abstract-block">
                    <strong>Abstract：</strong>${abstractText}
                </div>`;
            }

            // 6. 标签组区块
            const showResearch = visibleFields.has("research_tags") && research_tags;
            const showML = visibleFields.has("ml_tags") && ml_tags;
            const showSource = visibleFields.has("source_categories") && source_categories;

            if (showResearch || showML || showSource) {
                htmlContent += `<div class="paper-tags-group">`;
                if (showResearch) {
                    htmlContent += `<div><strong>Research Tags:</strong> <span class="paper-tags">${makeSpans(research_tags)}</span></div>`;
                }
                if (showML) {
                    htmlContent += `<div><strong>AI/ML Algorithms:</strong> <span class="paper-tags">${makeSpans(ml_tags)}</span></div>`;
                }
                if (showSource) {
                    htmlContent += `<div><strong>arXiv Categories:</strong> <span class="paper-tags">${makeSpans(source_categories)}</span></div>`;
                }
                htmlContent += `</div>`;
            }

            card.innerHTML = htmlContent;
            resultBox.appendChild(card);
        });

        // ===== 页面渲染完毕后，在底部拼接分页 DOM 按钮 =====
        const prevBtn = document.createElement("button");
        prevBtn.className = "page-btn";
        prevBtn.textContent = "◀ Previous";
        prevBtn.disabled = (currentPage === 1); // 处于第一页时自动锁定
        prevBtn.onclick = () => {
            currentPage--;
            searchPapers();
            window.scrollTo({ top: resultBox.offsetTop - 40, behavior: 'smooth' }); // 翻页后自动向上平滑锚定到结果框
        };

        const pageInfo = document.createElement("span");
        pageInfo.className = "page-info";
        pageInfo.textContent = `Page ${currentPage} `;

        const nextBtn = document.createElement("button");
        nextBtn.className = "page-btn";
        nextBtn.textContent = "Next ▶";
        nextBtn.disabled = !hasNextPage; // 后端无下一页数据时锁定
        nextBtn.onclick = () => {
            currentPage++;
            searchPapers();
            window.scrollTo({ top: resultBox.offsetTop - 40, behavior: 'smooth' });
        };

        paginationBar.appendChild(prevBtn);
        paginationBar.appendChild(pageInfo);
        paginationBar.appendChild(nextBtn);
    }

    // =========================
    // 初始化与重置事件
    // =========================
    searchBtn.onclick = () => {
        currentPage = 1; // 点击主大搜索时，务必重置回第一页
        searchPapers();
    };
    
    clearBtn.onclick = () => {
        Object.keys(selectedData).forEach(key => selectedData[key].clear());
        renderAllDimensions();
        resultBox.innerHTML = "All selected tags cleared.";
        paginationBar.innerHTML = "";
        lastSearchData = null; 
        currentPage = 1; 
    };

    loadAllTagsFromCargo();

})();
