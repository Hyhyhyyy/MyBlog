/* ============================================================
   Folder (React Bits) — vanilla port 交互
   点击 / 回车 / 空格 切换展开；白色文件扇出动效由 folder.css 负责。
   暴露 window.initFolders(root?) 以便手动初始化。
   ============================================================ */
(function () {
  'use strict';

  function initFolders(root) {
    root = root || document;
    var folders = root.querySelectorAll('.folder');
    for (var i = 0; i < folders.length; i++) {
      (function (folder) {
        if (folder.dataset.folderBound) return;
        folder.dataset.folderBound = '1';

        function toggle() {
          var open = folder.classList.toggle('open');
          folder.setAttribute('aria-expanded', open ? 'true' : 'false');
          // 点击文件夹 → 球面随机跳到该类别下的一个笔记
          var cat = folder.getAttribute('aria-label');
          if (cat && typeof window.focusNoteByCategory === 'function') {
            window.focusNoteByCategory(cat);
          }
        }

        folder.addEventListener('click', toggle);
        folder.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        });
      })(folders[i]);
    }
  }

  window.initFolders = initFolders;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initFolders(document); });
  } else {
    initFolders(document);
  }
})();
