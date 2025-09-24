// API base URL for backend - wait for config to load
let API_BASE = "http://localhost:3000"; // default fallback

// Function to ensure config is loaded
function ensureConfigLoaded() {
  return new Promise((resolve) => {
    // If config is already loaded, use it
    if (window.ENV && window.ENV.BACKEND_API) {
      API_BASE = window.ENV.BACKEND_API;
      resolve();
      return;
    }

    // If config is not loaded yet, wait for it
    const checkConfig = () => {
      if (window.ENV && window.ENV.BACKEND_API) {
        API_BASE = window.ENV.BACKEND_API;
        console.log("API URL loaded from config:", API_BASE);
        resolve();
      } else {
        // Check again in 10ms
        setTimeout(checkConfig, 10);
      }
    };

    checkConfig();
  });
}

/* Removed dynamic hero images loading function as hero images are now static */
function loadHeroImages() {
  // No operation since hero images are static now
}

const COUPON_KEY = 'yonutri_coupon_v1';

function getAppliedCoupon() {
    try {
        return JSON.parse(localStorage.getItem(COUPON_KEY) || 'null');
    } catch {
        return null;
    }
}

function calculateDiscount(subtotal, coupon) {
    if (!coupon) return 0;
    if (subtotal < (coupon.minimum_amount || 0)) return 0;
    let discount = coupon.discount_type === 'percent' ?
        subtotal * (coupon.discount_amount / 100) :
        coupon.discount_amount;
    return Math.min(Math.round(discount), subtotal);
}



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

// Helper function to load cart data
function loadCart() {
  try {
    return new Map(JSON.parse(localStorage.getItem('yonutri_cart_v1') || '[]'));
  } catch {
    return new Map();
  }
}

// Helper function to get cart total
function getModalCartTotal() {
  const cart = loadCart();
  let subtotal = 0;
  for (const [key, item] of cart) {
    subtotal += item.qty * item.price;
  }

  const appliedCoupon = getAppliedCoupon();
  const discount = calculateDiscount(subtotal, appliedCoupon);

  return subtotal - discount;
}

// Checkout modal with address collection and Razorpay integration
document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCheckoutModal();
    });
  }
});

// Create and open checkout modal
function openCheckoutModal() {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'checkoutModalOverlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.id = 'checkoutModalContent';
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  `;

  // Modal HTML content with all checkout functionality
  modalContent.innerHTML = `
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #333; font-size: 24px; font-weight: 600;">Complete Your Order</h2>
        <button id="closeCheckoutModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      </div>

      <!-- Customer Details Section -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Customer Details</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #555;">Name *</label>
            <input type="text" id="modalCustomerName" placeholder="Enter your name" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #555;">Email *</label>
            <input type="email" id="modalCustomerEmail" placeholder="Enter your email" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
          </div>
        </div>
      </div>

      <!-- Address Section -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Delivery Address</h3>

        <!-- Saved Addresses -->
        <div id="modalSavedAddresses" style="margin-bottom: 16px;">
          <p style="margin: 0 0 12px 0; font-weight: 500; color: #555;">Select from saved addresses:</p>
          <div id="modalAddressList" style="max-height: 150px; overflow-y: auto; margin-bottom: 16px;">
            <!-- Addresses will be loaded here -->
          </div>
        </div>

        <!-- Add New Address Option -->
        <div style="margin-bottom: 16px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="modalUseNewAddress" style="margin-right: 12px;">
            <span style="font-weight: 500;">Deliver to a new address</span>
          </label>
        </div>

        <!-- New Address Form -->
        <div id="modalNewAddressForm" style="display: none; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-top: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <input type="text" id="modalFirstName" placeholder="First Name" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            </div>
            <div>
              <input type="text" id="modalLastName" placeholder="Last Name" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <input type="tel" id="modalPhone" placeholder="Phone Number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
          </div>
          <div style="margin-bottom: 16px;">
            <input type="text" id="modalAddress" placeholder="Address" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <input type="text" id="modalCity" placeholder="City" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            </div>
            <div>
              <input type="text" id="modalState" placeholder="State" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <input type="text" id="modalPincode" placeholder="Postal/ZIP code" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
          </div>
          <div>
            <label style="display: flex; align-items: center;">
              <input type="checkbox" id="modalIsDefault" style="margin-right: 8px;">
              <span style="font-size: 14px;">Set as default address</span>
            </label>
          </div>
        </div>

        <!-- Selected Address Display -->
        <div id="modalSelectedAddressDisplay" style="margin-top: 16px; padding: 12px; background: #e8f5e8; border-radius: 8px; display: none;">
          <div style="font-weight: 500; margin-bottom: 8px; color: #2d5a2d;">Delivering to:</div>
          <div id="modalSelectedAddressText" style="color: #2d5a2d;"></div>
        </div>
      </div>

      <!-- Order Summary -->
      <div style="margin-bottom: 24px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Order Summary</h3>
        <div id="modalOrderSummary" style="margin-bottom: 16px; " >
          <!-- Order items will be loaded here -->
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 600; color: #333;">
          <span>Total:</span>
          <span id="modalTotalAmount">₹0</span>
        </div>
      </div>

      <!-- Pay Button -->
      <button id="modalPayButton" style="width: 100%; padding: 16px; background: #ff9500; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;">
        Pay ₹0
      </button>

      <div style="text-align: center; margin-top: 16px; color: #666; font-size: 14px;">
        <p>Secure payment powered by Razorpay</p>
      </div>
    </div>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Initialize modal functionality
  initializeCheckoutModal(modalOverlay);
}

// Initialize checkout modal functionality
function initializeCheckoutModal(overlay) {
  const content = overlay.querySelector('#checkoutModalContent');
  const closeBtn = content.querySelector('#closeCheckoutModal');
  const useNewAddress = content.querySelector('#modalUseNewAddress');
  const newAddressForm = content.querySelector('#modalNewAddressForm');
  const payButton = content.querySelector('#modalPayButton');
  const customerName = content.querySelector('#modalCustomerName');
  const customerEmail = content.querySelector('#modalCustomerEmail');
  const savedAddressesDiv = content.querySelector('#modalSavedAddresses');

  // Close modal handlers
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // Toggle new address form
  useNewAddress.addEventListener('change', function() {
    if (this.checked) {
      newAddressForm.style.display = 'block';
      window.selectedModalAddress = null; // Clear selected address
      updateModalSelectedAddressDisplay();
      // Deselect all address cards
      content.querySelectorAll('#modalAddressList > div').forEach(div => {
        div.style.background = '#fff';
        div.style.borderColor = '#ddd';
      });
    } else {
      newAddressForm.style.display = 'none';
    }
  });

  // Load cart data and order summary
  loadModalCartData(content);

  // Check for logged-in user and pre-fill data
  const token = localStorage.getItem('token');
  if (token) {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    if (userName) {
      customerName.value = userName;
      customerName.disabled = true;
    }
    if (userEmail) {
      customerEmail.value = userEmail;
      customerEmail.disabled = true;
    }
    
    // Load user addresses if logged in
    loadModalUserAddresses(content);
  } else {
    // Not logged in: hide saved addresses, force new address form
    savedAddressesDiv.style.display = 'none';
    useNewAddress.checked = true;
    useNewAddress.disabled = true;
    newAddressForm.style.display = 'block';
  }

  // Pay button handler
  payButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (validateModalCheckout(content)) {
      const name = customerName.value;
      const email = customerEmail.value;
      const totalAmount = getModalCartTotal();
      openModalRazorpayPayment(totalAmount, name, email, content);
    }
  });
}

// Load cart data into modal
function loadModalCartData(content) {
  const orderSummaryEl = content.querySelector('#modalOrderSummary');
  const payButton = content.querySelector('#modalPayButton');
  const summaryContainer = orderSummaryEl.parentElement;

  const cart = loadCart();
  let subtotal = 0;
  let itemsHtml = '';

  for (const [key, item] of cart) {
    subtotal += item.qty * item.price;
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
        <div>
          <div style="font-weight: 500;">${item.title}</div>
          <div style="font-size: 14px; color: #666;">${item.grams || ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 500;">${formatPrice(item.price)} × ${item.qty}</div>
          <div style="font-size: 14px; color: #666;">${formatPrice(item.price * item.qty)}</div>
        </div>
      </div>
    `;
  }

  const appliedCoupon = getAppliedCoupon();
  const discount = calculateDiscount(subtotal, appliedCoupon);
  const finalTotal = subtotal - discount;

  // Rebuild summary section to include discount
  summaryContainer.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Order Summary</h3>
    <div id="modalOrderSummary" style="margin-bottom: 16px;">
      ${itemsHtml}
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px; color: #555; margin-bottom: 8px;">
      <span>Subtotal:</span>
      <span>${formatPrice(subtotal)}</span>
    </div>
    ${discount > 0 && appliedCoupon ? `
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px; color: #28a745; margin-bottom: 8px;">
      <span>Discount (${appliedCoupon.code}):</span>
      <span>-${formatPrice(discount)}</span>
    </div>` : ''}
    <div style="border-top: 1px solid #ddd; margin-top: 16px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 600; color: #333;">
      <span>Total:</span>
      <span id="modalTotalAmount">${formatPrice(finalTotal)}</span>
    </div>
  `;

  payButton.textContent = `Pay ${formatPrice(finalTotal)}`;
}

// Helper function for retrying fetch requests
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Load user addresses in modal
async function loadModalUserAddresses(content) {
  const addressListEl = content.querySelector('#modalAddressList');
  const savedAddressesDiv = content.querySelector('#modalSavedAddresses');
  const useNewAddressCheckbox = content.querySelector('#modalUseNewAddress');
  const newAddressForm = content.querySelector('#modalNewAddressForm');

  window.selectedModalAddress = null;

  const token = localStorage.getItem('token');
  if (!token) {
    savedAddressesDiv.style.display = 'none';
    useNewAddressCheckbox.checked = true;
    useNewAddressCheckbox.disabled = true;
    newAddressForm.style.display = 'block';
    return;
  }

  try {
    const response = await fetchWithRetry(`${window.ENV.BACKEND_API}/api/user/addresses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const addresses = await response.json();

    if (response.ok && addresses.length > 0) {
      savedAddressesDiv.style.display = 'block';
      
      const renderList = () => {
        addressListEl.innerHTML = '';
        const selectedId = window.selectedModalAddress ? window.selectedModalAddress.id : null;
        
        addresses.forEach(address => {
          const isDefault = address.is_default ? ' (Default)' : '';
          const isSelected = address.id === selectedId;
          const addressDiv = document.createElement('div');
          addressDiv.style.cssText = `border: 1px solid ${isSelected ? '#28a745' : '#ddd'}; border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; background: ${isSelected ? '#e8f5e8' : '#fff'};`;
          addressDiv.innerHTML = `
            <div style="font-weight: 500;">${address.first_name} ${address.last_name}${isDefault}</div>
            <div style="font-size: 14px; color: #666; margin: 4px 0;">
              ${address.address}<br>
              ${address.city}, ${address.state} - ${address.pincode}<br>
              Phone: ${address.phone}
            </div>
          `;
          addressDiv.addEventListener('click', () => {
            window.selectedModalAddress = address;
            useNewAddressCheckbox.checked = false;
            newAddressForm.style.display = 'none';
            updateModalSelectedAddressDisplay();
            renderList(); // Re-render to update selection highlight
          });
          addressListEl.appendChild(addressDiv);
        });
      };

      // Auto-select default address
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      if (defaultAddress) {
        window.selectedModalAddress = defaultAddress;
        updateModalSelectedAddressDisplay();
      }
      
      renderList();

    } else {
      // No saved addresses, force new address form
      savedAddressesDiv.style.display = 'none';
      useNewAddressCheckbox.checked = true;
      useNewAddressCheckbox.disabled = true;
      newAddressForm.style.display = 'block';
    }
  } catch (error) {
    console.error('Load addresses error:', error);
    savedAddressesDiv.innerHTML = '<p style="color: red;">Failed to load addresses.</p>';
  }
}

// Modal address selection
function updateModalSelectedAddressDisplay() {
  const displayDiv = document.getElementById('modalSelectedAddressDisplay');
  const textSpan = document.getElementById('modalSelectedAddressText');

  if (window.selectedModalAddress) {
    textSpan.innerHTML = `
      <strong>${window.selectedModalAddress.first_name} ${window.selectedModalAddress.last_name}</strong><br>
      ${window.selectedModalAddress.address}<br>
      ${window.selectedModalAddress.city}, ${window.selectedModalAddress.state} - ${window.selectedModalAddress.pincode}<br>
      Phone: ${window.selectedModalAddress.phone}
    `;
    displayDiv.style.display = 'block';
  } else {
    displayDiv.style.display = 'none';
  }
}

// Get selected address data from modal
function getModalSelectedAddressData() {
  if (window.selectedModalAddress) {
    return {
      first_name: window.selectedModalAddress.first_name,
      last_name: window.selectedModalAddress.last_name,
      phone: window.selectedModalAddress.phone,
      address: window.selectedModalAddress.address,
      city: window.selectedModalAddress.city,
      state: window.selectedModalAddress.state,
      pincode: window.selectedModalAddress.pincode,
      is_default: window.selectedModalAddress.is_default
    };
  }

  // Get data from new address form
  return {
    first_name: document.getElementById('modalFirstName').value,
    last_name: document.getElementById('modalLastName').value,
    phone: document.getElementById('modalPhone').value,
    address: document.getElementById('modalAddress').value,
    city: document.getElementById('modalCity').value,
    state: document.getElementById('modalState').value,
    pincode: document.getElementById('modalPincode').value,
    is_default: document.getElementById('modalIsDefault').checked
  };
}

// Validate modal checkout
function validateModalCheckout(content) {
  const customerName = content.querySelector('#modalCustomerName').value;
  const customerEmail = content.querySelector('#modalCustomerEmail').value;

  if (!customerName || customerName.trim() === '') {
    alert('Please enter your name');
    return false;
  }

  if (!customerEmail || customerEmail.trim() === '') {
    alert('Please enter your email');
    return false;
  }

  const addressData = getModalSelectedAddressData();
  if (!addressData.address || !addressData.city || !addressData.state || !addressData.pincode) {
    alert('Please select a delivery address or fill in the new address form');
    return false;
  }

  return true;
}

// Razorpay payment function for modal
function openModalRazorpayPayment(amountInRupees, customerName, customerEmail, content) {
  if (!amountInRupees || amountInRupees <= 0) {
    alert('Your cart is empty or invalid amount');
    return;
  }

  const amountInPaise = Math.round(amountInRupees * 100);

  const options = {
    key: "rzp_live_RD5dCjd57Ylvjh",
    amount: amountInPaise,
    currency: "INR",
    name: "Yo Nutri",
    description: "Purchase from Yo Nutri",
    image: "https://razorpay.com/favicon.png",
    handler: async function (response) {
      // Create order in database after successful payment
      const cartItems = Array.from(loadCart()).map(([key, item]) => ({
        variant_id: item.variant_id,
        quantity: item.qty,
        price: item.price
      }));
      const addressData = getModalSelectedAddressData();

      try {
        // The backend handles DB order, Shiprocket, and email in one call.
        const orderCreationRes = await fetch(`${API_BASE}/api/create-order-from-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              payment_id: response.razorpay_payment_id,
              amount: amountInRupees,
              email: customerEmail,
              customer_name: customerName,
              cart_items: cartItems,
              shipping_address: addressData.address,
              shipping_city: addressData.city,
              shipping_state: addressData.state,
              shipping_pincode: addressData.pincode,
              shipping_phone: addressData.phone
            })
          });

        const data = await orderCreationRes.json();

        if (!orderCreationRes.ok) {
            throw new Error(data.message || 'Order creation failed');
        }

        console.log('Order creation response:', data);
        alert(`Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nOrder ID: ${data.order_id || 'N/A'}\nShiprocket Order ID: ${data.shiprocket_order_id || 'N/A'}\n\nYour order has been created. You will receive a confirmation email shortly.`);

      } catch (err) {
        console.error('Error in post-payment order creation:', err);
        alert(`Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\n\nThere was an issue creating your order. Please contact support with your Payment ID.`);
      }

      // Clear cart and close modal after successful payment
      localStorage.removeItem('yonutri_cart_v1');
      document.body.removeChild(document.getElementById('checkoutModalOverlay'));
      window.location.href = 'index.html';
    },
    prefill: {
      name: customerName,
      email: customerEmail,
      contact: ""
    },
    theme: {
      color: "#ff9500"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
  // <script src="config.js"></script>
