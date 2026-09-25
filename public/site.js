document.querySelectorAll('.mobile-journey a').forEach(link=>link.addEventListener('click',()=>{const menu=link.closest('details');if(menu)menu.open=false}));
