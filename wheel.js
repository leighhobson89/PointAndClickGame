// script.js

document.addEventListener('DOMContentLoaded', function() {
    const wheelMenu = document.getElementById('wheel-menu');
    const wheelTrigger = document.getElementById('wheel-trigger');
    const wheelList = document.getElementById('wheel-list');
    let currentScrollPosition = 0;

    // Open the wheel menu when the button is clicked
    wheelTrigger.addEventListener('click', function() {
        wheelMenu.style.display = wheelMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Handle mousewheel scroll on the menu
    wheelMenu.addEventListener('wheel', function(event) {
        event.preventDefault(); // Prevent default scrolling

        const wheelItems = wheelList.querySelectorAll('li');
        const itemHeight = wheelItems[0].offsetHeight;
        const maxScrollPosition = -(itemHeight * (wheelItems.length - 3)); // limit scrolling

        // Update the scroll position based on wheel direction
        if (event.deltaY > 0) {
            // Scroll down
            if (currentScrollPosition > maxScrollPosition) {
                currentScrollPosition -= itemHeight;
            }
        } else {
            // Scroll up
            if (currentScrollPosition < 0) {
                currentScrollPosition += itemHeight;
            }
        }

        // Apply the scroll position to the list (translateY for smooth scroll)
        wheelList.style.transform = `translateY(${currentScrollPosition}px)`;
    });
});
