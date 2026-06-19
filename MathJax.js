// ==========================================
// 1. 自动化 MathJax LaTeX 公式渲染引擎
// ==========================================
(function () {
    if (window.MathJax) return;

    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
            processEnvironments: true
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
        },
        startup: {
            pageReady: function () {
                return MathJax.startup.defaultPageReady().then(function () {
                    initMathJaxObserver();
                });
            }
        }
    };

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    document.head.appendChild(script);

    function initMathJaxObserver() {
        if (!window.MathJax || !window.MathJax.typesetPromise) return;

        var observer = new MutationObserver(function (mutations) {
            var needTypeset = false;
            for (var i = 0; i < mutations.length; i++) {
                var addedNodes = mutations[i].addedNodes;
                for (var j = 0; j < addedNodes.length; j++) {
                    var node = addedNodes[j];
                    if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.tagName)) {
                        if (node.textContent && (node.textContent.includes('$') || node.textContent.includes('\\('))) {
                            needTypeset = true;
                            break;
                        }
                    }
                }
                if (needTypeset) break;
            }

            if (needTypeset) {
                clearTimeout(window.mathjaxTimeout);
                window.mathjaxTimeout = setTimeout(function () {
                    window.MathJax.typesetPromise();
                }, 150);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
