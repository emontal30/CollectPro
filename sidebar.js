
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.querySelector(".sidebar-toggle");

    if (!sidebar || !sidebarToggle) {
        console.error("Sidebar or toggle button not found!");
        return;
    }

    // Function to toggle the sidebar
    const toggleSidebar = () => {
        const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
        sidebar.classList.toggle("sidebar-collapsed", isCollapsed);
        localStorage.setItem("sidebar-collapsed", isCollapsed ? "true" : "false");
    };

    sidebarToggle.addEventListener("click", toggleSidebar);

    // --- Initial State --- 
    // Check local storage to set the initial state of the sidebar
    const isInitiallyCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    
    // Apply the state without transition first to avoid animation on load
    sidebar.style.transition = 'none'; 
    document.body.classList.toggle("sidebar-collapsed", isInitiallyCollapsed);
    sidebar.classList.toggle("sidebar-collapsed", isInitiallyCollapsed);
    
    // Restore transition after a short delay
    setTimeout(() => {
        sidebar.style.transition = '';
    }, 50); 

});
