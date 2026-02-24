import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, Coins, Info, Shield, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- API Services ---
interface ItemMapping {
  id: number;
  name: string;
  examine: string;
  members: boolean;
  lowalch?: number;
  highalch?: number;
  limit?: number;
  value: number;
  icon: string;
}

interface ItemPrice {
  high: number;
  highTime: number;
  low: number;
  lowTime: number;
}

interface DetailedItem {
  id: number;
  name: string;
  equipment?: {
    attack_stab: number;
    attack_slash: number;
    attack_crush: number;
    attack_magic: number;
    attack_ranged: number;
    defence_stab: number;
    defence_slash: number;
    defence_crush: number;
    defence_magic: number;
    defence_ranged: number;
    melee_strength: number;
    ranged_strength: number;
    magic_damage: number;
    prayer: number;
    slot: string;
    requirements?: Record<string, number>;
  };
  weapon?: {
    attack_speed: number;
    weapon_type: string;
  };
  weight?: number;
}

const API_HEADERS = {
  'User-Agent': 'RuneData GE Tracker - GitHub Pages Deployment',
};

async function fetchItemMapping(): Promise<ItemMapping[]> {
  const res = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch mapping');
  return res.json();
}

async function fetchLatestPrices(): Promise<Record<string, ItemPrice>> {
  const res = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch prices');
  const json = await res.json();
  return json.data;
}

async function fetchDetailedData(): Promise<Record<string, DetailedItem>> {
  const res = await fetch('https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-complete.json');
  if (!res.ok) throw new Error('Failed to fetch detailed data');
  return res.json();
}

// --- Utility ---
function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatNumberExact(num: number): string {
  return num.toLocaleString();
}

function formatTimeAgo(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Components ---
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

type Status = 'online' | 'offline' | 'loading';

export default function App() {
  const [items, setItems] = useState<ItemMapping[]>([]);
  const [prices, setPrices] = useState<Record<string, ItemPrice>>({});
  const [detailedData, setDetailedData] = useState<Record<string, DetailedItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<Record<string, Status>>({
    wiki: 'loading',
    prices: 'loading',
    osrsbox: 'loading'
  });
  
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemMapping | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        const fetchWiki = async () => {
          try {
            const data = await fetchItemMapping();
            setApiStatus(prev => ({ ...prev, wiki: 'online' }));
            return data;
          } catch (e) {
            setApiStatus(prev => ({ ...prev, wiki: 'offline' }));
            throw e;
          }
        };

        const fetchPrices = async () => {
          try {
            const data = await fetchLatestPrices();
            setApiStatus(prev => ({ ...prev, prices: 'online' }));
            return data;
          } catch (e) {
            setApiStatus(prev => ({ ...prev, prices: 'offline' }));
            throw e;
          }
        };

        const fetchDetails = async () => {
          try {
            const data = await fetchDetailedData();
            setApiStatus(prev => ({ ...prev, osrsbox: 'online' }));
            return data;
          } catch (e) {
            setApiStatus(prev => ({ ...prev, osrsbox: 'offline' }));
            throw e;
          }
        };

        const [mappingData, pricesData, details] = await Promise.all([
          fetchWiki(),
          fetchPrices(),
          fetchDetails()
        ]);
        
        // Sort items alphabetically for better default search results
        const sortedItems = mappingData.sort((a, b) => a.name.localeCompare(b.name));
        setItems(sortedItems);
        setPrices(pricesData);
        setDetailedData(details);
      } catch (err) {
        setError('Failed to load market data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Periodic status check
    const interval = setInterval(async () => {
      try {
        const check = async (url: string, key: string) => {
          try {
            const res = await fetch(url, { method: 'HEAD', headers: key === 'osrsbox' ? {} : API_HEADERS });
            setApiStatus(prev => ({ ...prev, [key]: res.ok ? 'online' : 'offline' }));
          } catch {
            setApiStatus(prev => ({ ...prev, [key]: 'offline' }));
          }
        };
        
        check('https://prices.runescape.wiki/api/v1/osrs/mapping', 'wiki');
        check('https://prices.runescape.wiki/api/v1/osrs/latest', 'prices');
        check('https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-complete.json', 'osrsbox');
      } catch (e) {
        console.error('Status check failed', e);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    
    // Exact match first, then starts with, then includes
    const exactMatches: ItemMapping[] = [];
    const startsWithMatches: ItemMapping[] = [];
    const includesMatches: ItemMapping[] = [];

    for (const item of items) {
      const lowerName = item.name.toLowerCase();
      if (lowerName === lowerQuery) {
        exactMatches.push(item);
      } else if (lowerName.startsWith(lowerQuery)) {
        startsWithMatches.push(item);
      } else if (lowerName.includes(lowerQuery)) {
        includesMatches.push(item);
      }
      
      if (exactMatches.length + startsWithMatches.length + includesMatches.length > 50) {
        break; // Limit results for performance
      }
    }

    return [...exactMatches, ...startsWithMatches, ...includesMatches].slice(0, 10);
  }, [query, items]);

  const handleSelectItem = (item: ItemMapping) => {
    setSelectedItem(item);
    setQuery('');
    setIsFocused(false);
    setFocusedIndex(-1);
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setQuery('');
    setFocusedIndex(-1);
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (input) input.focus();
    }, 50);
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
        handleSelectItem(searchResults[focusedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectItem(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const selectedItemDetails = selectedItem ? detailedData[selectedItem.id] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-white/20 flex flex-col items-center pt-[15vh] pb-20 px-4 sm:px-6">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl flex flex-col items-center"
      >
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-12 text-white/90">
          Rune<span className="font-semibold">Data</span>
        </h1>

        <div className="w-full relative" ref={searchContainerRef}>
          {/* Search Bar */}
          <div className={`relative flex items-center w-full bg-[#141414] border transition-colors duration-300 rounded-2xl overflow-hidden ${isFocused ? 'border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'border-white/10'}`}>
            <div className="pl-5 pr-3 text-white/40">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </div>
            <input
              id="search-input"
              type="text"
              className="w-full py-4 bg-transparent outline-none text-lg placeholder:text-white/20 font-light"
              placeholder={loading ? "Loading market data..." : "Search for an item..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="pr-5 pl-3 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Autosuggest Dropdown */}
          <AnimatePresence>
            {isFocused && query.trim() && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                <ul className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar">
                  {searchResults.map((item, index) => {
                    const priceData = prices[item.id];
                    const currentPrice = priceData ? Math.max(priceData.high, priceData.low) : 0;
                    const isFocusedItem = index === focusedIndex;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleSelectItem(item)}
                          className={`w-full text-left px-5 py-3 transition-colors flex items-center justify-between group ${isFocusedItem ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-lg p-1">
                              <img 
                                src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`} 
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjwvc3ZnPg==';
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-white/90 group-hover:text-white transition-colors">{item.name}</div>
                              <div className="text-xs text-white/40 font-mono truncate max-w-[200px] sm:max-w-[300px]">{item.examine}</div>
                            </div>
                          </div>
                          {currentPrice > 0 && (
                            <div className="text-right flex flex-col items-end">
                              <div className="text-sm font-mono text-[#eab308] flex items-center gap-1">
                                {formatNumber(currentPrice)} <Coins className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          <AnimatePresence>
            {isFocused && query.trim() && searchResults.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#141414] border border-white/10 rounded-2xl p-8 text-center shadow-2xl z-50"
              >
                <p className="text-white/40">No items found matching "{query}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Selected Item Details */}
      <AnimatePresence mode="wait">
        {selectedItem && (
          <motion.div
            key={selectedItem.id}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mt-8"
          >
            <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <button 
                onClick={clearSelection}
                className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                  {/* Icon Container */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-4">
                    <img 
                      src={`https://oldschool.runescape.wiki/images/${selectedItem.icon.replace(/ /g, '_')}`} 
                      alt={selectedItem.name}
                      className="max-w-full max-h-full object-contain drop-shadow-2xl scale-125"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjwvc3ZnPg==';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl sm:text-3xl font-medium text-white/90">{selectedItem.name}</h2>
                      {selectedItem.members && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20 rounded text-[10px] font-mono uppercase tracking-wider">
                          Members
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm mb-6 leading-relaxed">
                      {selectedItem.examine}
                    </p>

                    {/* Market Data Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        const priceData = prices[selectedItem.id];
                        
                        if (!priceData) {
                          return (
                            <div className="col-span-2 text-white/30 text-sm py-4 text-center border border-white/5 rounded-xl border-dashed">
                              No recent market data available
                            </div>
                          );
                        }

                        const margin = priceData.high - priceData.low;
                        const roi = priceData.low > 0 ? (margin / priceData.low) * 100 : 0;

                        return (
                          <>
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-mono mb-2">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Insta-Buy
                              </div>
                              <div className="text-xl font-mono text-white/90 flex items-center gap-2">
                                {formatNumberExact(priceData.high)}
                                <Coins className="w-4 h-4 text-yellow-500/70" />
                              </div>
                              <div className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTimeAgo(priceData.highTime)}
                              </div>
                            </div>

                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-mono mb-2">
                                <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Insta-Sell
                              </div>
                              <div className="text-xl font-mono text-white/90 flex items-center gap-2">
                                {formatNumberExact(priceData.low)}
                                <Coins className="w-4 h-4 text-yellow-500/70" />
                              </div>
                              <div className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTimeAgo(priceData.lowTime)}
                              </div>
                            </div>

                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-mono mb-2">
                                <Coins className="w-3.5 h-3.5" /> Margin
                              </div>
                              <div className="text-lg font-mono text-white/90">
                                {formatNumberExact(margin)}
                              </div>
                              <div className="text-[10px] text-emerald-400/70 mt-1">
                                {roi.toFixed(2)}% ROI
                              </div>
                            </div>

                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-mono mb-2">
                                <Shield className="w-3.5 h-3.5" /> Buy Limit
                              </div>
                              <div className="text-lg font-mono text-white/90">
                                {selectedItem.limit ? formatNumberExact(selectedItem.limit) : 'Unknown'}
                              </div>
                              <div className="text-[10px] text-white/30 mt-1">
                                Per 4 hours
                              </div>
                            </div>
                            
                            {/* Alch Values */}
                            <div className="col-span-2 flex gap-4 mt-2 pt-4 border-t border-white/5">
                              <div className="flex-1">
                                <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-1">High Alch</div>
                                <div className="text-sm font-mono text-white/70">{selectedItem.highalch ? formatNumberExact(selectedItem.highalch) : 'N/A'}</div>
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-1">Low Alch</div>
                                <div className="text-sm font-mono text-white/70">{selectedItem.lowalch ? formatNumberExact(selectedItem.lowalch) : 'N/A'}</div>
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-1">Store Price</div>
                                <div className="text-sm font-mono text-white/70">{selectedItem.value ? formatNumberExact(selectedItem.value) : 'N/A'}</div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Detailed Attributes (Stats & Requirements) */}
                {selectedItemDetails && (selectedItemDetails.equipment || selectedItemDetails.weapon || selectedItemDetails.requirements) && (
                  <div className="border-t border-white/5 pt-8">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-white/30 mb-6">Combat Attributes</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {/* Attack Bonuses */}
                      {selectedItemDetails.equipment && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Attack Bonuses</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            {[
                              ['Stab', selectedItemDetails.equipment.attack_stab],
                              ['Slash', selectedItemDetails.equipment.attack_slash],
                              ['Crush', selectedItemDetails.equipment.attack_crush],
                              ['Magic', selectedItemDetails.equipment.attack_magic],
                              ['Ranged', selectedItemDetails.equipment.attack_ranged],
                            ].map(([label, val]) => (
                              <div key={label} className="flex justify-between text-sm font-mono">
                                <span className="text-white/30">{label}</span>
                                <span className={Number(val) > 0 ? 'text-emerald-400' : Number(val) < 0 ? 'text-rose-400' : 'text-white/60'}>
                                  {Number(val) > 0 ? `+${val}` : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Defence Bonuses */}
                      {selectedItemDetails.equipment && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Defence Bonuses</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            {[
                              ['Stab', selectedItemDetails.equipment.defence_stab],
                              ['Slash', selectedItemDetails.equipment.defence_slash],
                              ['Crush', selectedItemDetails.equipment.defence_crush],
                              ['Magic', selectedItemDetails.equipment.defence_magic],
                              ['Ranged', selectedItemDetails.equipment.defence_ranged],
                            ].map(([label, val]) => (
                              <div key={label} className="flex justify-between text-sm font-mono">
                                <span className="text-white/30">{label}</span>
                                <span className={Number(val) > 0 ? 'text-emerald-400' : Number(val) < 0 ? 'text-rose-400' : 'text-white/60'}>
                                  {Number(val) > 0 ? `+${val}` : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Bonuses */}
                      {selectedItemDetails.equipment && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Other Bonuses</h4>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            {[
                              ['Melee Str', selectedItemDetails.equipment.melee_strength],
                              ['Ranged Str', selectedItemDetails.equipment.ranged_strength],
                              ['Magic Dmg', `${selectedItemDetails.equipment.magic_damage}%`],
                              ['Prayer', selectedItemDetails.equipment.prayer],
                            ].map(([label, val]) => (
                              <div key={label} className="flex justify-between text-sm font-mono">
                                <span className="text-white/30">{label}</span>
                                <span className={parseFloat(String(val)) > 0 ? 'text-emerald-400' : parseFloat(String(val)) < 0 ? 'text-rose-400' : 'text-white/60'}>
                                  {parseFloat(String(val)) > 0 && !String(val).includes('%') ? `+${val}` : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Requirements & Info */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">General Info</h4>
                        <div className="space-y-2">
                          {selectedItemDetails.equipment?.slot && (
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-white/30">Slot</span>
                              <span className="text-white/60 capitalize">{selectedItemDetails.equipment.slot}</span>
                            </div>
                          )}
                          {selectedItemDetails.weapon?.attack_speed && (
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-white/30">Speed</span>
                              <span className="text-white/60">{selectedItemDetails.weapon.attack_speed} ticks</span>
                            </div>
                          )}
                          {selectedItemDetails.weight !== undefined && (
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-white/30">Weight</span>
                              <span className="text-white/60">{selectedItemDetails.weight} kg</span>
                            </div>
                          )}
                          
                          {/* Requirements */}
                          {selectedItemDetails.equipment?.requirements && Object.keys(selectedItemDetails.equipment.requirements).length > 0 && (
                            <div className="pt-2 border-t border-white/5 mt-2">
                              <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2">Requirements</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(selectedItemDetails.equipment.requirements).map(([skill, level]) => (
                                  <span key={skill} className="px-2 py-1 bg-white/5 rounded text-xs font-mono text-white/70">
                                    <span className="capitalize">{skill}</span> {level}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-8 text-rose-400/80 text-sm flex items-center gap-2 bg-rose-400/10 px-4 py-2 rounded-lg border border-rose-400/20">
          <Info className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-20 pb-10 w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {[
            { name: 'Wiki API', status: apiStatus.wiki },
            { name: 'Prices API', status: apiStatus.prices },
            { name: 'OSRSBox DB', status: apiStatus.osrsbox },
          ].map((source) => (
            <div key={source.name} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                source.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                source.status === 'offline' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                'bg-white/20 animate-pulse'
              }`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">{source.name}</span>
            </div>
          ))}
        </div>

        <a 
          href="https://x.com/beaudenison" 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 text-white/20 hover:text-white transition-all hover:scale-110"
        >
          <XIcon />
        </a>
      </footer>

    </div>
  );
}
