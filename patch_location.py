"""
Patches index.html to replace the simple location button with the full
Farm Location Widget (GPS tab + Manual Entry tab with autocomplete).
Run: python patch_location.py
"""
import re

SRC = r'c:\Users\srish\OneDrive\Desktop\TIME PASS\index.html'

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

OLD = '''                    <!-- ─── Location Detection ─────────────────────────────────── -->
                    <div class="field-group location-group">
                        <button type="button" id="locateBtn" class="btn-locate" aria-label="Detect my location">
                            📍 Use My Location
                        </button>
                        <p class="field-help">Auto-fills your growing season and shows live weather conditions.</p>
                        <div id="locationCard" class="location-card hidden" aria-live="polite"></div>
                    </div>

                    <div class="form-divider"><span>— or fill in manually —</span></div>'''

NEW = '''                    <!-- ─── Farm Location Widget ──────────────────────────────── -->
                    <div class="flw-widget" id="farmLocationWidget">
                        <div class="flw-header">
                            <div class="flw-header-left">
                                <span class="flw-icon">🗺️</span>
                                <div>
                                    <span class="flw-title">Farm Location</span>
                                    <span class="flw-subtitle">Auto-fills weather · soil · season · pH</span>
                                </div>
                            </div>
                            <span id="flwActiveLoc" class="flw-active-loc hidden"></span>
                        </div>

                        <div class="flw-tabs" role="tablist" aria-label="Location entry mode">
                            <button class="flw-tab active" id="tab-gps" role="tab" aria-selected="true" aria-controls="panel-gps">
                                🛰️ GPS Auto-Detect
                            </button>
                            <button class="flw-tab" id="tab-manual" role="tab" aria-selected="false" aria-controls="panel-manual">
                                ✏️ Enter Manually
                            </button>
                        </div>

                        <!-- GPS Panel -->
                        <div class="flw-panel" id="panel-gps" role="tabpanel" aria-labelledby="tab-gps">
                            <button type="button" id="locateBtn" class="btn-locate" aria-label="Detect my location using GPS">
                                📍 Use My Location
                            </button>
                            <p class="field-help" style="margin-top:8px;">Requires browser location permission. If denied, switch to ✏️ manual entry above.</p>
                            <div id="locationCard" class="location-card hidden" aria-live="polite"></div>
                        </div>

                        <!-- Manual Entry Panel -->
                        <div class="flw-panel hidden" id="panel-manual" role="tabpanel" aria-labelledby="tab-manual">
                            <div class="flw-search-wrap">
                                <span class="flw-search-icon">📍</span>
                                <input
                                    type="text"
                                    id="locationSearch"
                                    class="flw-search-input"
                                    placeholder="Type city, district or village…"
                                    autocomplete="off"
                                    aria-label="Search location"
                                    aria-autocomplete="list"
                                    aria-controls="locationSuggestions"
                                />
                                <button type="button" id="clearLocSearch" class="flw-clear-btn" aria-label="Clear search" hidden>✕</button>
                            </div>
                            <p class="flw-search-help">Start typing — suggestions appear automatically.</p>

                            <div id="locationSuggestions" class="flw-suggestions hidden" role="listbox" aria-label="Location suggestions"></div>

                            <div id="manualLocDisplay" class="flw-selected hidden" aria-live="polite"></div>

                            <p id="manualLocErr" class="flw-error hidden" role="alert"></p>

                            <div id="recentLocationsPanel" class="flw-recent hidden">
                                <span class="flw-recent-label">🕐 Recent Locations</span>
                                <div id="recentList" class="flw-recent-list"></div>
                            </div>

                            <button type="button" id="manualLocBtn" class="btn-manual-locate" disabled>
                                🌾 Use This Location
                            </button>
                        </div>
                    </div>

                    <div class="form-divider"><span>— adjust farm conditions below —</span></div>'''

if OLD in html:
    html = html.replace(OLD, NEW, 1)
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS: Farm Location Widget injected.")
else:
    print("ERROR: Target string not found. Checking content...")
    # Show around the location section for debugging
    idx = html.find('Location Detection')
    if idx >= 0:
        print(html[idx-50:idx+500])
    else:
        print("No 'Location Detection' found either.")
