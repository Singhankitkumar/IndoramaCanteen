import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Menu } from './components/Menu';
import { Cart } from './components/Cart';
import { Orders } from './components/Orders';
import { OrderModal } from './components/OrderModal';
import { AdminPanel } from './components/AdminPanel';
import { PartyOrderForm } from './components/PartyOrderForm';
import { PartyOrders } from './components/PartyOrders';
import { BillingStatement } from './components/BillingStatement';
import { ConsumptionReports } from './components/ConsumptionReports';
import { MenuItem, supabase } from './lib/supabase';
import { PartyOrder } from './lib/types';
import {
  UtensilsCrossed,
  ShoppingCart,
  History,
  LogOut,
  Shield,
  Gift,
  FileText,
  BarChart3,
} from 'lucide-react';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'party' | 'billing' | 'admin' | 'reports'>('menu');
  const [cart, setCart] = useState<Map<string, { item: MenuItem; quantity: number }>>(new Map());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPartyOrderFormOpen, setIsPartyOrderFormOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const addToCart = (item: MenuItem) => {
    const newCart = new Map(cart);
    const existing = newCart.get(item.id);
    if (existing) {
      newCart.set(item.id, { item, quantity: existing.quantity + 1 });
    } else {
      newCart.set(item.id, { item, quantity: 1 });
    }
    setCart(newCart);
  };

  const removeFromCart = (itemId: string) => {
    const newCart = new Map(cart);
    const existing = newCart.get(itemId);
    if (existing && existing.quantity > 1) {
      newCart.set(itemId, { ...existing, quantity: existing.quantity - 1 });
    } else {
      newCart.delete(itemId);
    }
    setCart(newCart);
  };

  const deleteFromCart = (itemId: string) => {
    const newCart = new Map(cart);
    newCart.delete(itemId);
    setCart(newCart);
  };

  const placeOrder = async (notes: string, pickupTime: string) => {
    if (cart.size === 0) return;

    const cartItems = Array.from(cart.values());
    const totalAmount = cartItems.reduce(
      (sum, { item, quantity }) => sum + item.price * quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        status: 'pending',
        notes,
        pickup_time: pickupTime || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      alert('Failed to place order. Please try again.');
      return;
    }

    const orderItems = cartItems.map(({ item, quantity }) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      alert('Failed to place order. Please try again.');
      return;
    }

    setCart(new Map());
    setIsOrderModalOpen(false);
    setIsCartOpen(false);
    setActiveTab('orders');
  };

  const cartItems = Array.from(cart.values());
  const cartTotal = cartItems.reduce(
    (sum, { item, quantity }) => sum + item.price * quantity,
    0
  );
  const cartQuantity = cartItems.reduce((sum, { quantity }) => sum + quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Indorama Canteen
                </h1>
                <p className="text-xs text-gray-500">
                  Welcome, {profile?.full_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'menu' && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ShoppingCart className="w-6 h-6 text-gray-700" />
                  {cartQuantity > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-orange-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {cartQuantity}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => signOut()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="flex border-t overflow-x-auto">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'menu'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5" />
              Menu
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-5 h-5" />
              My Orders
            </button>
            <button
              onClick={() => setActiveTab('party')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'party'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Gift className="w-5 h-5" />
              Party Orders
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-5 h-5" />
              Billing
            </button>
            {profile?.is_admin && (
              <>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'reports'
                      ? 'border-b-2 border-orange-600 text-orange-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Reports
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'border-b-2 border-orange-600 text-orange-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'menu' && (
          <>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsPartyOrderFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Gift className="w-5 h-5" />
                New Party Order
              </button>
            </div>
            <Menu
              cart={new Map(Array.from(cart.entries()).map(([id, data]) => [id, data.quantity]))}
              onAddToCart={addToCart}
              onRemoveFromCart={removeFromCart}
            />
          </>
        )}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'party' && <PartyOrders />}
        {activeTab === 'billing' && <BillingStatement />}
        {activeTab === 'reports' && profile?.is_admin && <ConsumptionReports />}
        {activeTab === 'admin' && profile?.is_admin && <AdminPanel />}
      </main>

      <Cart
        items={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={deleteFromCart}
        onPlaceOrder={() => setIsOrderModalOpen(true)}
      />

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onConfirm={placeOrder}
        total={cartTotal}
      />

      <PartyOrderForm
        isOpen={isPartyOrderFormOpen}
        onClose={() => setIsPartyOrderFormOpen(false)}
        userId={user?.id || ''}
        onSubmit={async (orderData, items) => {
          if (!user) return;

          const cartItems = Array.from(items.entries());

          const { data: menuItems, error: menuError } = await supabase
            .from('menu_items')
            .select('id, price')
            .in('id', cartItems.map(([itemId]) => itemId));

          if (menuError) {
            console.error('Error fetching menu items:', menuError);
            alert('Failed to fetch menu items. Please try again.');
            return;
          }

          const totalAmount = cartItems.reduce((sum, [itemId, qty]) => {
            const menuItem = menuItems?.find(m => m.id === itemId);
            return sum + (menuItem?.price || 0) * qty;
          }, 0);

          const { data: partyOrder, error: orderError } = await supabase
            .from('party_orders')
            .insert({
              user_id: user.id,
              ...orderData,
              total_cost: totalAmount,
            })
            .select()
            .single();

          if (orderError) {
            console.error('Error creating party order:', orderError);
            alert('Failed to create party order. Please try again.');
            return;
          }

          const partyOrderItems = cartItems.map(([itemId, quantity]) => ({
            party_order_id: partyOrder.id,
            menu_item_id: itemId,
            quantity,
          }));

          const { error: itemsError } = await supabase
            .from('party_order_items')
            .insert(partyOrderItems);

          if (itemsError) {
            console.error('Error creating party order items:', itemsError);
            alert('Failed to create party order items. Please try again.');
            return;
          }

          alert('Party order submitted successfully!');
          setActiveTab('party');
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
