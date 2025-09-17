// API base URL for backend



const API_BASE = window.ENV.BACKEND_API || "http://localhost:3000";

/* Removed dynamic hero images loading function as hero images are now static */
function loadHeroImages() {
  // No operation since hero images are static now
}

// Product loading and rendering functionality
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    // loadHeroImages(); // Removed as hero images are now static

    // Initialize sliders for static bars
    const barsGrid = document.querySelector('#barsGrid');
    if (barsGrid && barsGrid.closest) {
      const barsSlider = barsGrid.closest('.love-slider');
      if (barsSlider) initializeSlider(barsSlider);
    }

    const roastedGrid = document.querySelector('#roastedGrid');
    if (roastedGrid && roastedGrid.closest) {
      const roastedSlider = roastedGrid.closest('.love-slider');
      if (roastedSlider) initializeSlider(roastedSlider);
    }

    const proteinBarsGrid = document.querySelector('#proteinBarsGrid');
    if (proteinBarsGrid && proteinBarsGrid.closest) {
      const proteinSlider = proteinBarsGrid.closest('.love-slider');
      if (proteinSlider) initializeSlider(proteinSlider);
    }
});

function formatPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return '₹0';
    // Format price without decimals and remove trailing .00 if any
    return '₹' + Math.floor(num).toLocaleString('en-IN');
}


async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const loadingElement = document.getElementById('loadingProducts');

    try {
        const response = await fetch(API_BASE + '/api/products');
        let products = await response.json();

        console.log('All products from API:', products); // Debug: see all products

        // Filter out bars categories (4,5,6) so bars only show in bars section
        products = products.filter(product => {
            // Exclude bars categories
            const categoryId = product.category_id;
            const categoryName = product.category_name ? product.category_name.toLowerCase() : '';
            const isBarCategoryId = [4,5,6].includes(categoryId);
            const isBarCategoryName = categoryName.includes('bar') || categoryName.includes('bars');
            const isBar = isBarCategoryId || isBarCategoryName;
            if (isBar) console.log('Filtering out bar product:', product.name, 'category:', categoryId, categoryName);

            // Additional filtering: exclude products with missing or invalid data
            const hasValidId = product.id !== null && product.id !== undefined;
            const hasValidName = product.name && product.name.trim() !== '';
            const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

            if (!hasValidId || !hasValidName || !hasVariants) {
                console.log('Filtering out invalid product:', product);
                return false;
            }

            return !isBar;
        });
        console.log('Filtered products (bars excluded):', products); // Debug: see filtered products

        // Remove loading message
        if (loadingElement) {
            loadingElement.remove();
        }

        // Render products
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsGrid.appendChild(productCard);

            // Add event listener for grams selection
            const select = productCard.querySelector('.pack-select');
            const titleAnchor = productCard.querySelector('.yo-title a');
            const priceEl = productCard.querySelector('.yo-price');
            const productName = titleAnchor ? titleAnchor.textContent.replace(/\s*\d+g\s*$/, '') : '';

            if (select && titleAnchor && priceEl) {
                select.addEventListener('change', () => {
                    const selectedOption = select.options[select.selectedIndex];
                    const grams = selectedOption.value;
                    const price = selectedOption.dataset.price;
                    const img = selectedOption.dataset.img || '';

                    // Update title text to include grams, but remove any existing grams suffix first
                    const baseTitle = productName.replace(/\s*\d+\s*gms?$/i, '').trim();
                    titleAnchor.textContent = `${baseTitle} ${grams}gms`;

                    // Update href with new grams and price
                    const hrefBase = 'product-detail.html';
                    const params = new URLSearchParams({
                        sku: productCard.dataset.sku || '',
                        title: titleAnchor.textContent,
                        price: price,
                        img: img,
                        grams: grams
                    });
                    titleAnchor.href = `${hrefBase}?${params.toString()}`;

                    // Update price display with formatted price
                    priceEl.textContent = formatPrice(price);
                });
            }

            // Add event listener for "ADD TO CART" button
            const addToCartBtn = productCard.querySelector('.yo-cta');
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', () => {
                    const selectedOption = select.options[select.selectedIndex];
                    const grams = selectedOption.value;
                    const price = selectedOption.dataset.price;
                    const img = product.image_url || '';
                    const title = product.name;
                    const sku = product.id;

                    const item = { sku, title, price, img, grams };
                    if (window.addToCart) {
                        window.addToCart(item, 1);
                    } else {
                        console.error('addToCart function not found.');
                    }
                });
            }
        });

    } catch (error) {
        console.error('Error loading products:', error);
        if (loadingElement) {
            loadingElement.innerHTML = '<p>Error loading products. Please try again later.</p>';
        }
    }
}

async function loadCoupons() {
    const couponsContainer = document.getElementById('couponsContainer');
    if (!couponsContainer) return;

    try {
        const response = await fetch(API_BASE + '/api/coupons');
        const coupons = await response.json();

        if (!Array.isArray(coupons) || coupons.length === 0) {
            couponsContainer.innerHTML = '<p>No coupons available at the moment.</p>';
            return;
        }

        couponsContainer.innerHTML = ''; // Clear existing coupons

        coupons.forEach(coupon => {
            const couponEl = document.createElement('div');
            couponEl.className = 'coupon';

            const expiryDate = coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'No expiry';

            couponEl.innerHTML = `
                <h4>${coupon.code}</h4>
                <p>${coupon.description || ''}</p>
                <p>Discount: ${coupon.discount_type === 'percent' ? coupon.discount_amount + '%' : '₹' + coupon.discount_amount}</p>
                <p>Minimum Purchase: ₹${coupon.minimum_amount || 0}</p>
                <p>Expires on: ${expiryDate}</p>
            `;

            couponsContainer.appendChild(couponEl);
        });

    } catch (error) {
        console.error('Error loading coupons:', error);
        couponsContainer.innerHTML = '<p>Error loading coupons. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadCoupons();
    // loadHeroImages(); // Removed as hero images are now static

    // Initialize sliders for static bars
    const barsGrid = document.querySelector('#barsGrid');
    if (barsGrid && barsGrid.closest) {
      const barsSlider = barsGrid.closest('.love-slider');
      if (barsSlider) initializeSlider(barsSlider);
    }

    const roastedGrid = document.querySelector('#roastedGrid');
    if (roastedGrid && roastedGrid.closest) {
      const roastedSlider = roastedGrid.closest('.love-slider');
      if (roastedSlider) initializeSlider(roastedSlider);
    }

    const proteinBarsGrid = document.querySelector('#proteinBarsGrid');
    if (proteinBarsGrid && proteinBarsGrid.closest) {
      const proteinSlider = proteinBarsGrid.closest('.love-slider');
      if (proteinSlider) initializeSlider(proteinSlider);
    }
});

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'yo-card';
    card.setAttribute('data-sku', product.id);

    // Get the first variant for display
    const firstVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;

    if (!firstVariant) {
        return card; // Return empty card if no variants
    }

    // Create options for the select dropdown
    // Prevent duplicate pack of grams in dropdown options
    const seenGrams = new Set();
    const options = product.variants.filter(variant => {
        if (seenGrams.has(variant.grams)) {
            return false;
        } else {
            seenGrams.add(variant.grams);
            return true;
        }
    }).map(variant => {
        return `<option value="${variant.grams}" data-price="${variant.price}" data-img="${product.image_url || ''}">Pack of ${variant.grams}gms</option>`;
    }).join('');

    card.innerHTML = `
        <div class="yo-arch" style="position: relative;">
            <a href="product-detail.html?sku=${product.id}&title=${encodeURIComponent(product.name)}&price=${firstVariant.price}&img=${encodeURIComponent(product.image_url || '')}&grams=${encodeURIComponent(firstVariant.grams)}" class="protect-copy">
                <img src="${product.image_url || 'images/placeholder.png'}" alt="${product.name}" class="protect-copy" onerror="this.src='images/placeholder.png'">
            </a>
        </div>
        <span class="new-badge">NEW</span>
        <div class="yo-info">
            <div class="yo-title">
                <a href="product-detail.html?sku=${product.id}&title=${encodeURIComponent(product.name)}&price=${firstVariant.price}&img=${encodeURIComponent(product.image_url || '')}&grams=${encodeURIComponent(firstVariant.grams)}" class="protect-copy">${product.name} ${firstVariant.grams}gms</a>
            </div>
            <div class="yo-price">${formatPrice(firstVariant.price)}</div>
            <div class="yo-tax">${product.description || ''}</div>
            <div class="yo-actions">
                <div class="yo-split">
                    <select class="pack-select">
                        ${options}
                    </select>
                    <button class="yo-cta" type="button">ADD TO CART</button>
                </div>
            </div>
        </div>
    `;
    console.log('Product card HTML:', card.innerHTML);

    return card;
}

// Bars loading and rendering functionality
async function loadBars() {
    const barsGrid = document.getElementById('barsGrid');
    const loadingElement = document.getElementById('loadingBars');

    try {
        const response = await fetch(API_BASE + '/api/chocolate-bars');
        const bars = await response.json();

        // Remove loading message
        if (loadingElement) {
            loadingElement.remove();
        }

        // Clear existing bars before rendering new ones
        barsGrid.innerHTML = '';

        // Render bars
        bars.forEach((bar, index) => {
            const barCard = createBarCard(bar, 'chocolate', index + 1);
            barsGrid.appendChild(barCard);
        });

        // Initialize slider for barsGrid
        initializeSlider(barsGrid.closest('.love-slider'));

    } catch (error) {
        console.error('Error loading bars:', error);
        if (loadingElement) {
            loadingElement.innerHTML = '<p>Error loading bars. Please try again later.</p>';
        }
    }
}

async function loadRoastedBars() {
    const roastedGrid = document.getElementById('roastedGrid');
    const loadingElement = document.getElementById('loadingRoasted');

    try {
        const response = await fetch(API_BASE + '/api/roasted-bars');
        const bars = await response.json();

        if (loadingElement) {
            loadingElement.remove();
        }

        // Clear existing roasted bars before rendering new ones
        roastedGrid.innerHTML = '';

        bars.forEach((bar, index) => {
            const barCard = createBarCard(bar, 'roasted', index + 1);
            roastedGrid.appendChild(barCard);
        });

        // Initialize slider for roastedGrid
        initializeSlider(roastedGrid.closest('.love-slider'));

    } catch (error) {
        console.error('Error loading roasted bars:', error);
        if (loadingElement) {
            loadingElement.innerHTML = '<p>Error loading roasted bars. Please try again later.</p>';
        }
    }
}

async function loadProteinBars() {
    const proteinBarsGrid = document.getElementById('proteinBarsGrid');
    const loadingElement = document.getElementById('loadingProteinBars');

    try {
        const response = await fetch(API_BASE + '/api/protein-bars');
        const bars = await response.json();

        if (loadingElement) {
            loadingElement.remove();
        }

        // Clear existing protein bars before rendering new ones
        proteinBarsGrid.innerHTML = '';

        bars.forEach((bar, index) => {
            const barCard = createBarCard(bar, 'protein', index + 1);
            proteinBarsGrid.appendChild(barCard);
        });

        // Initialize slider for proteinBarsGrid
        initializeSlider(proteinBarsGrid.closest('.love-slider'));

    } catch (error) {
        console.error('Error loading protein bars:', error);
        if (loadingElement) {
            loadingElement.innerHTML = '<p>Error loading protein bars. Please try again later.</p>';
        }
    }
}

function createBarCard(bar, category, index) {
    const card = document.createElement('article');
    card.className = 'love-card';

    // Get the first variant for display, or fallback to product data if no variants
    const firstVariant = bar.variants && bar.variants.length > 0 ? bar.variants[0] : null;

    // Use variant data if available, otherwise use product base_price
    const price = firstVariant ? firstVariant.price : bar.base_price;
    const grams = firstVariant ? firstVariant.grams : 'Standard';

    // Dynamically set the redirect URL
    const redirectUrl = `${category}${index}.html`;

    card.innerHTML = `
        <div class="love-arch">
            <img src="${bar.image_url || 'images/placeholder.png'}" alt="${bar.name}" class="protect-copy" onerror="this.src='images/placeholder.png'">
        </div>
        <a href="${redirectUrl}?sku=${bar.id}&title=${encodeURIComponent(bar.name)}&price=${price}&img=${encodeURIComponent(bar.image_url || '')}&grams=${encodeURIComponent(grams)}" class="protect-copy">
            <button class="love-btn">Let's Explore!</button>
        </a>
    `;

    return card;
}

function initializeSlider(slider) {
  if (!slider) return;

  const strip   = slider.querySelector('.strip');                // element we move
  const grid    = strip.querySelector('.yn-love__grid');
  const cards   = Array.from(grid.querySelectorAll('.love-card'));
  const leftBtn = slider.querySelector('.left-btn');
  const rightBtn= slider.querySelector('.right-btn');

  console.log('Initializing slider for:', slider.className);
  console.log('Number of cards:', cards.length);

  let index = 0;                 // how many cards we’ve shifted
  let cardW = 0;                 // measured width of a card
  let gap   = 0;                 // computed column-gap

  function visibleCount(){
    // Calculate visible count dynamically based on slider width and card width and gap
    const sliderWidth = slider.getBoundingClientRect().width;
    const cardWidth = cards[0]?.getBoundingClientRect().width || 1;
    const cs = getComputedStyle(grid);
    const gap = parseFloat(cs.columnGap || cs.gap || '0') || 0;
    const visible = Math.max(1, Math.floor((sliderWidth + gap) / (cardWidth + gap)));
    console.log('Visible count:', visible, 'Slider width:', sliderWidth, 'Card width:', cardWidth, 'Gap:', gap);
    return visible;
  }
  function measure(){
    // measure AFTER layout so it’s accurate
    cardW = cards[0]?.getBoundingClientRect().width || 0;
    const cs = getComputedStyle(grid);
    gap = parseFloat(cs.columnGap || cs.gap || '0') || 0;
    console.log('Measured card width:', cardW, 'Gap:', gap);
  }

  function maxIndex(){
    const max = Math.max(0, cards.length - visibleCount());
    console.log('Max index:', max, 'Cards length:', cards.length, 'Visible count:', visibleCount());
    return max;
  }
  function updateButtons(){
    const max = maxIndex();
    leftBtn.disabled  = index <= 0;
    rightBtn.disabled = index >= max;
    console.log('Button states - Left disabled:', leftBtn.disabled, 'Right disabled:', rightBtn.disabled, 'Current index:', index);
  }
  function update(){
    const offset = index * (cardW + gap);
    strip.style.transform = `translateX(-${offset}px)`;   // move by exactly 1 card width per index
    updateButtons();
    console.log('Updated slider - Index:', index, 'Offset:', offset);
  }

  rightBtn.addEventListener('click', () => {
    const max = maxIndex();
    if (index < max) { index = Math.min(max, index + visibleCount()); update(); }
    console.log('Right button clicked - New index:', index);
  });
  leftBtn.addEventListener('click', () => {
    if (index > 0) { index = Math.max(0, index - visibleCount()); update(); }
    console.log('Left button clicked - New index:', index);
  });

  // Re-measure on resize (keeps step precise at all widths)
  const onResize = () => { measure(); const max = maxIndex(); if (index > max) index = max; update(); };
  window.addEventListener('resize', onResize);
  if (document.fonts?.ready) document.fonts.ready.then(onResize);

  // initial
  measure(); update();

  // Debug: Log all cards visibility
  setTimeout(() => {
    console.log('=== SLIDER DEBUG ===');
    console.log('Slider element:', slider);
    console.log('Total cards in DOM:', cards.length);
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const sliderRect = slider.getBoundingClientRect();
      const isVisible = rect.right > sliderRect.left && rect.left < sliderRect.right;
      console.log(`Card ${i}: visible=${isVisible}, left=${rect.left}, right=${rect.right}, sliderLeft=${sliderRect.left}, sliderRight=${sliderRect.right}`);
    });
  }, 1000);
}

document.querySelectorAll('.love-slider').forEach(slider => {
  initializeSlider(slider);
});

// Razorpay integration function to open payment modal with dynamic amount (in rupees)
function openRazorpayPayment(amountInRupees) {
  if (!amountInRupees || amountInRupees <= 0) {
    alert('Invalid payment amount');
    return;
  }
  const amountInPaise = Math.round(amountInRupees * 100); // Razorpay expects amount in paise

  const options = {
    key: "rzp_live_RD5dCjd57Ylvjh", // Replace with your Razorpay key
    amount: amountInPaise,
    currency: "INR",
    name: "Yo Nutri",
    description: "Purchase from Yo Nutri",
    image: "https://razorpay.com/favicon.png",
    handler: function (response) {
      alert("Payment Successful!\nPayment ID: " + response.razorpay_payment_id);
      // TODO: Add post-payment success logic here (e.g., order confirmation)
    },
    prefill: {
      name: "",
      email: "",
      contact: ""
    },
    theme: {
      color: "#3399cc"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// Modify checkout button click handler to open Razorpay modal with cart total
document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const totalEl = document.getElementById('totalRupees');
      if (!totalEl) {
        alert('Unable to find total amount');
        return;
      }
      // Extract numeric value from total text like "₹299"
      const totalText = totalEl.textContent || '';
      const amountMatch = totalText.match(/[\d,.]+/);
      if (!amountMatch) {
        alert('Invalid total amount');
        return;
      }
      const amount = parseFloat(amountMatch[0].replace(/,/g, ''));
      openRazorpayPayment(amount);
    });
  }
});
