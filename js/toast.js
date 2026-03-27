/**
 * H-MUSIC Toast Notification System
 * Multi-Stacking Implementation (Top-Right)
 * Supports Clickable Toasts
 */

const ToastSystem = (function() {
    let container = null;
    const MAX_TOASTS = 5;

    function createContainer() {
        if (document.getElementById('hmusic-toast-container')) {
            return document.getElementById('hmusic-toast-container');
        }
        const div = document.createElement('div');
        div.id = 'hmusic-toast-container';
        document.body.appendChild(div);
        return div;
    }

    function show(message, type = 'info', duration = 4000, onclickAction = null) {
        container = createContainer();
        
        if (container.children.length >= MAX_TOASTS) {
            const oldest = container.firstChild;
            if (oldest) oldest.removeToast();
        }

        const toast = document.createElement('div');
        toast.className = `hmusic-toast ${type}`;
        if (onclickAction) toast.classList.add('clickable');
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        const icon = icons[type] || icons.info;

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div class="toast-content">${message}</div>
            <i class="fa-solid fa-xmark toast-close"></i>
        `;

        let timeout;
        toast.removeToast = () => {
            if (toast.isRemoving) return;
            toast.isRemoving = true;
            clearTimeout(timeout);
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        };

        // Event Listeners
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            toast.removeToast();
        };

        if (onclickAction) {
            toast.onclick = () => {
                onclickAction();
                toast.removeToast();
            };
        }

        container.appendChild(toast);

        timeout = setTimeout(() => {
            toast.removeToast();
        }, duration);
    }

    return { show: show };
})();

window.showToast = ToastSystem.show;
