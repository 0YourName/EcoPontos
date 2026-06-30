// EcoPontos Bandeirantes - Core JavaScript Application

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // State & Variables
    // ----------------------------------------------------
    let activeSection = 'inicio';
    let fontScale = 100;
    let ttsActive = false;
    let speechRecognitionActive = false;
    let map = null;
    let mapMarkers = [];

    // UI Selectors
    const navLinks = document.querySelectorAll('.nav-link-custom');
    const sections = document.querySelectorAll('.app-section');
    const descarteGuideWrapper = document.getElementById('descarte-guide-wrapper');
    const coletaMapWrapper = document.getElementById('coleta-map-wrapper');

    const btnContrast = document.getElementById('btn-contrast');
    const btnFontIncrease = document.getElementById('btn-font-increase');
    const btnFontDecrease = document.getElementById('btn-font-decrease');
    const btnFontReset = document.getElementById('btn-font-reset');
    const btnTtsToggle = document.getElementById('btn-tts-toggle');
    const btnVoiceToggle = document.getElementById('btn-voice-toggle');
    const voiceTooltip = document.getElementById('voice-tooltip');
    const voiceStatusText = document.getElementById('voice-status');
    const toastAccessibility = document.getElementById('accessibility-toast');
    const toastText = document.getElementById('toast-text');

    // Simulated collection points data (Bandeirantes - PR)
    const pointsData = [
        {
            id: 0,
            name: "EcoPonto Parque do Povo",
            coords: [-23.103781187511, -50.36666367021205],
            address: "Rua Dino Veiga, s/n - Vila Maria Alice, Bandeirantes - PR",
            hours: "Sábado: 09h00 às 13h00",
            phone: "(43) 99122-3344",
            allowed: [
                "Celulares e tablets",
                "Carregadores, cabos e fones",
                "Pilhas e baterias de uso doméstico",
                "Eletroportáteis pequenos (secador, liquidificador, etc.)"
            ],
            notAllowed: [
                "Lâmpadas (entregar em coletores de vidro)",
                "Baterias automotivas (devolver em lojas/oficinas)",
                "Computadores e notebooks (descarte no ponto da UENP)",
                "Grandes eletrodomésticos (descarte no ponto da Praça Brasil/Japão)"
            ],
            icon: "bi-battery-charging"
        },
        {
            id: 1,
            name: "EcoPonto UENP (Campus Luiz Meneghel)",
            coords: [-23.10659817049162, -50.360406635430664],
            address: "Campus Luiz Meneghel - BR-369, s/n - Bandeirantes, PR",
            hours: "Segunda a Sexta: 08h00 às 21h00",
            phone: "(43) 99133-5566",
            allowed: [
                "Computadores, notebooks e gabinetes",
                "Monitores de computador e impressoras",
                "Mouses, teclados e periféricos",
                "Cabos de dados e placas de circuito"
            ],
            notAllowed: [
                "Lâmpadas fluorescentes (necessitam descarte especial)",
                "Pilhas e baterias soltas (descarte no ponto do Parque do Povo)",
                "Celulares e tablets (descarte no ponto do Parque do Povo)",
                "Grandes eletrodomésticos (descarte no ponto da Praça Brasil/Japão)"
            ],
            icon: "bi-laptop"
        },
        {
            id: 2,
            name: "EcoPonto Praça da Brasil/Japão",
            coords: [-23.106753503628596, -50.37548821534646],
            address: "Praça Mal. Deodoro, s/n - Centro, Bandeirantes - PR",
            hours: "Sábado: 09h00 às 13h00",
            phone: "(43) 99144-7788",
            allowed: [
                "Geladeiras e fogões antigos",
                "Fornos elétricos e micro-ondas",
                "Televisores e monitores de TV",
                "Ventiladores e aparelhos de ar-condicionado"
            ],
            notAllowed: [
                "Pilhas e baterias portáteis (descarte no ponto do Parque do Povo)",
                "Celulares e tablets (descarte no ponto do Parque do Povo)",
                "Computadores e notebooks (descarte no ponto da UENP)",
                "Lâmpadas fluorescentes (necessitam descarte especial)"
            ],
            icon: "bi-tv"
        }
    ];

    // E-waste Impact constants per unit (simulated metrics)
    const IMPACT_METRICS = {
        celular: { water: 50000, soil: 20, degradation: 1000, recovery: 100, weight: 0.2 },
        computador: { water: 100000, soil: 50, degradation: 1000, recovery: 150, weight: 12.0 },
        pilha: { water: 20000, soil: 10, degradation: 400, recovery: 50, weight: 0.05 },
        tv: { water: 80000, soil: 40, degradation: 1000, recovery: 120, weight: 15.0 },
        geladeira: { water: 150000, soil: 100, degradation: 1000, recovery: 200, weight: 60.0 }
    };

    // ----------------------------------------------------
    // Section Navigation Logic (Supports Unified Descarte/Coleta)
    // ----------------------------------------------------
    function showSection(sectionId) {
        sections.forEach(sec => {
            // Handle descarte/pontos-coleta sharing the same container section
            if (sec.id === 'descarte' && (sectionId === 'descarte' || sectionId === 'pontos-coleta')) {
                sec.classList.add('active');
            } else if (sec.id === sectionId) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Toggle sub-containers inside the unified page
        if (sectionId === 'descarte') {
            descarteGuideWrapper.style.display = 'block';
            coletaMapWrapper.style.display = 'block';
        } else if (sectionId === 'pontos-coleta') {
            descarteGuideWrapper.style.display = 'none';
            coletaMapWrapper.style.display = 'block';
        }

        // Highlight correct nav links
        navLinks.forEach(link => {
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        activeSection = sectionId;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Trigger map initialization and resize
        if (sectionId === 'pontos-coleta' || sectionId === 'descarte') {
            initLeafletMap();
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        }

        // Narrate tab changes if TTS is active
        if (ttsActive) {
            let sectionName = "";
            switch (sectionId) {
                case 'inicio': sectionName = "Início"; break;
                case 'descarte': sectionName = "Como descartar"; break;
                case 'pontos-coleta': sectionName = "Pontos de coleta"; break;
                case 'dashboard': sectionName = "Painel de Impacto Ambiental"; break;
                case 'sobre': sectionName = "Sobre nós"; break;
            }
            speakText(`Navegando para a seção: ${sectionName}`);
        }
    }
    window.showSection = showSection;

    // Attach click events to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            showSection(targetSection);
        });
    });

    // ----------------------------------------------------
    // Accessibility Features (Fonts, Contrast)
    // ----------------------------------------------------
    function showToast(message) {
        toastText.textContent = message;
        toastAccessibility.classList.add('show');
        setTimeout(() => {
            toastAccessibility.classList.remove('show');
        }, 3000);
    }

    // High Contrast Switcher
    btnContrast.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        const isActive = document.body.classList.contains('high-contrast');
        localStorage.setItem('highContrast', isActive ? 'true' : 'false');
        showToast(isActive ? "Contraste Alto ativado." : "Contraste normal ativado.");

        // Leaflet map layer adjustments if contrast changes
        if (map) {
            map.remove();
            map = null;
            initLeafletMap();
        }

        // Recreate charts to update colors for high contrast
        if (collectedChart) collectedChart.destroy();
        if (materialsChart) materialsChart.destroy();
        initCharts();
    });

    // Check saved high contrast preference
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }

    // Font Sizing logic
    function updateFontScale() {
        document.documentElement.style.setProperty('--font-scale', `${fontScale}%`);
        localStorage.setItem('fontScale', fontScale);
    }

    btnFontIncrease.addEventListener('click', () => {
        if (fontScale < 160) {
            fontScale += 10;
            updateFontScale();
            showToast(`Tamanho do texto aumentado para ${fontScale}%.`);
        }
    });

    btnFontDecrease.addEventListener('click', () => {
        if (fontScale > 80) {
            fontScale -= 10;
            updateFontScale();
            showToast(`Tamanho do texto reduzido para ${fontScale}%.`);
        }
    });

    btnFontReset.addEventListener('click', () => {
        fontScale = 100;
        updateFontScale();
        showToast("Tamanho do texto redefinido para 100%.");
    });

    // Load saved font scale
    if (localStorage.getItem('fontScale')) {
        fontScale = parseInt(localStorage.getItem('fontScale'));
        updateFontScale();
    }

    // ----------------------------------------------------
    // Text To Speech (TTS) - Native SpeechSynthesis
    // ----------------------------------------------------
    let currentUtterance = null;

    function speakText(text) {
        if (!window.speechSynthesis) return;

        // Cancel current speaking
        window.speechSynthesis.cancel();

        if (!text) return;

        const cleanText = text.replace(/<[^>]*>/g, ""); // strip any html
        currentUtterance = new SpeechSynthesisUtterance(cleanText);
        currentUtterance.lang = 'pt-BR';

        // Select a good pt-BR voice if available
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-BR'));
        if (ptVoice) {
            currentUtterance.voice = ptVoice;
        }

        window.speechSynthesis.speak(currentUtterance);
    }

    btnTtsToggle.addEventListener('click', () => {
        ttsActive = !ttsActive;
        document.body.classList.toggle('tts-active', ttsActive);

        if (ttsActive) {
            btnTtsToggle.classList.add('active');
            btnTtsToggle.innerHTML = '<i class="bi bi-volume-up-fill"></i> Parar Leitor';
            btnTtsToggle.style.backgroundColor = 'var(--accent-color)';
            btnTtsToggle.style.color = '#0f172a';
            showToast("Leitor de voz ativado. Passe o mouse ou clique nos textos para ouvir.");
            speakText("O leitor de voz do site foi ativado. Você pode passar o mouse ou clicar em qualquer bloco de texto para ouvir a leitura.");
        } else {
            btnTtsToggle.classList.remove('active');
            btnTtsToggle.innerHTML = '<i class="bi bi-volume-up"></i> Ouvir Site';
            btnTtsToggle.style.backgroundColor = 'transparent';
            btnTtsToggle.style.color = 'var(--text-primary)';
            window.speechSynthesis.cancel();
            showToast("Leitor de voz desativado.");
        }
    });

    // Inline speaker button readers
    document.body.addEventListener('click', (e) => {
        const speakerBtn = e.target.closest('.speaker-btn');
        if (speakerBtn) {
            e.stopPropagation();
            const parentElement = speakerBtn.closest('.tts-readable');
            if (parentElement) {
                const label = parentElement.getAttribute('aria-label');
                if (label) {
                    speakText(label);
                } else {
                    // Get sibling text content excluding the button itself
                    let clone = parentElement.cloneNode(true);
                    const buttonInClone = clone.querySelector('.speaker-btn');
                    if (buttonInClone) buttonInClone.remove();
                    speakText(clone.innerText);
                }
            }
        }
    });

    // Delegated TTS Hover Reading (Handles static and dynamic content, e.g., point list cards, buttons)
    let lastSpokenElement = null;

    document.body.addEventListener('mouseover', (e) => {
        if (!ttsActive) return;

        // Closest element that is readable or interactive
        const element = e.target.closest('.tts-readable, button, .nav-link-custom, .point-list-item');
        if (!element) return;

        // Avoid repeating text if cursor moves inside child elements
        if (lastSpokenElement === element) return;
        lastSpokenElement = element;

        // Don't read the speaker button on hover to avoid double speech
        if (element.classList.contains('speaker-btn')) return;

        // Clone element to manipulate content safely
        let clone = element.cloneNode(true);

        // Remove any nested speaker buttons so they aren't read as text
        const nestedSpeaker = clone.querySelector('.speaker-btn');
        if (nestedSpeaker) nestedSpeaker.remove();

        const textToRead = clone.getAttribute('aria-label') || clone.innerText || '';
        if (textToRead.trim()) {
            speakText(textToRead);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (!ttsActive) return;

        const element = e.target.closest('.tts-readable, button, .nav-link-custom, .point-list-item');
        if (element && element === lastSpokenElement) {
            const related = e.relatedTarget;
            if (!related || !element.contains(related)) {
                lastSpokenElement = null;
            }
        }
    });

    // Load voices if not loaded immediately
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => { };
    }

    // ----------------------------------------------------
    // Speech Recognition (STT) - Voice Commands
    // ----------------------------------------------------
    let recognition = null;

    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            btnVoiceToggle.style.display = 'none';
            console.log("Speech Recognition API not supported in this browser.");
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            speechRecognitionActive = true;
            btnVoiceToggle.classList.add('listening');
            voiceStatusText.innerHTML = "<strong>Estou ouvindo...</strong> Fale um comando.";
            voiceTooltip.classList.add('visible');
            speakText(""); // Stop TTS when listening to avoid loops
        };

        recognition.onerror = (e) => {
            console.error("Speech recognition error", e);
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript.toLowerCase().trim();
            console.log("Heard:", transcript);
            voiceStatusText.innerHTML = `Entendido: <strong>"${transcript}"</strong>`;

            setTimeout(() => {
                voiceTooltip.classList.remove('visible');
            }, 2500);

            handleVoiceCommand(transcript);
        };
    }

    function stopListening() {
        speechRecognitionActive = false;
        btnVoiceToggle.classList.remove('listening');
        setTimeout(() => {
            if (!speechRecognitionActive) {
                voiceTooltip.classList.remove('visible');
            }
        }, 3000);
    }

    function handleVoiceCommand(command) {
        // Nav Commands
        if (command.includes('início') || command.includes('inicio') || command.includes('home')) {
            showSection('inicio');
            showToast("Navegando para o Início via comando de voz.");
        } else if (command.includes('descarte') || command.includes('como separar') || command.includes('separar')) {
            showSection('descarte');
            showToast("Navegando para Descarte via comando de voz.");
        } else if (command.includes('ponto') || command.includes('coleta') || command.includes('mapa') || command.includes('endereço')) {
            showSection('pontos-coleta');
            showToast("Navegando para Pontos de Coleta via comando de voz.");
        } else if (command.includes('painel') || command.includes('dashboard') || command.includes('gráfico') || command.includes('impacto')) {
            showSection('dashboard');
            showToast("Navegando para o Painel via comando de voz.");
        } else if (command.includes('sobre') || command.includes('empresa') || command.includes('equipe')) {
            showSection('sobre');
            showToast("Navegando para Sobre Nós via comando de voz.");
        }

        // Font accessibility
        else if (command.includes('aumentar letra') || command.includes('aumentar fonte')) {
            if (fontScale < 160) {
                fontScale += 10;
                updateFontScale();
                showToast("Tamanho aumentado.");
                speakText("Tamanho da fonte aumentado.");
            }
        } else if (command.includes('diminuir letra') || command.includes('diminuir fonte')) {
            if (fontScale > 80) {
                fontScale -= 10;
                updateFontScale();
                showToast("Tamanho diminuído.");
                speakText("Tamanho da fonte diminuído.");
            }
        }

        // Contraste
        else if (command.includes('contraste') || command.includes('alto contraste')) {
            document.body.classList.toggle('high-contrast');
            const isActive = document.body.classList.contains('high-contrast');
            localStorage.setItem('highContrast', isActive ? 'true' : 'false');
            showToast(isActive ? "Contraste ativado." : "Contraste desativado.");
            speakText(isActive ? "Alto contraste ativado." : "Contraste redefinido.");
            if (map) {
                map.remove();
                map = null;
                initLeafletMap();
            }
            if (collectedChart) collectedChart.destroy();
            if (materialsChart) materialsChart.destroy();
            initCharts();
        }

        // Reading command
        else if (command.includes('ler') || command.includes('leitura')) {
            const currentSecEl = document.getElementById(activeSection);
            if (currentSecEl) {
                speakText(currentSecEl.innerText);
            }
        }

        // Calculator Selector voice shortcuts
        else if (command.includes('bateria') || command.includes('pilha')) {
            showSection('dashboard');
            document.getElementById('calc-pilha').value = 5;
            updateCalculator();
            speakText("Calculado para 5 pilhas.");
        } else if (command.includes('celular') || command.includes('telefone')) {
            showSection('dashboard');
            document.getElementById('calc-celular').value = 2;
            updateCalculator();
            speakText("Calculado para 2 celulares.");
        } else if (command.includes('computador') || command.includes('pc') || command.includes('notebook')) {
            showSection('dashboard');
            document.getElementById('calc-computador').value = 1;
            updateCalculator();
            speakText("Calculado para 1 computador.");
        } else if (command.includes('televisor') || command.includes('tv') || command.includes('tela')) {
            showSection('dashboard');
            document.getElementById('calc-tv').value = 1;
            updateCalculator();
            speakText("Calculado para 1 televisão.");
        } else if (command.includes('geladeira') || command.includes('eletrodoméstico')) {
            showSection('dashboard');
            document.getElementById('calc-geladeira').value = 1;
            updateCalculator();
            speakText("Calculado para 1 eletrodoméstico.");
        }

        else {
            showToast(`Comando "${command}" não reconhecido.`);
            speakText("Desculpe, não entendi este comando.");
        }
    }

    btnVoiceToggle.addEventListener('click', () => {
        if (!recognition) {
            initSpeechRecognition();
        }

        if (speechRecognitionActive) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    });

    // ----------------------------------------------------
    // Leaflet.js Map - Bandeirantes, PR
    // ----------------------------------------------------
    function initLeafletMap() {
        if (map) return; // already initialized

        const mapEl = document.getElementById('map-container');
        if (!mapEl) return;

        // Custom Leaflet styling base tiles
        const isContrast = document.body.classList.contains('high-contrast');
        const tileUrl = isContrast
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // high contrast dark tiles
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // standard tiles

        const tileAttribution = isContrast
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; OpenStreetMap contributors';

        // Coordinates centered on Bandeirantes, PR (-23.1065, -50.3685)
        map = L.map('map-container').setView([-23.1065, -50.3685], 14);

        L.tileLayer(tileUrl, {
            attribution: tileAttribution,
            maxZoom: 19
        }).addTo(map);

        // Clear existing markers references
        mapMarkers = [];

        // Build list sidebar and markers
        const pointListContainer = document.getElementById('point-list');
        if (pointListContainer) {
            pointListContainer.innerHTML = '';
        }

        pointsData.forEach(point => {
            // Build permitted/prohibited lists for Leaflet Popup
            const popupAllowedList = point.allowed.map(item => `<li>${item}</li>`).join('');
            const popupNotAllowedList = point.notAllowed.map(item => `<li>${item}</li>`).join('');

            // Popup HTML
            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; color: #000; min-width: 250px;">
                    <h6 style="font-weight: 700; margin: 0 0 4px 0; color: #0f172a;">${point.name}</h6>
                    <p style="font-size: 0.8rem; margin: 0 0 8px 0; color: #64748b;">${point.address}</p>
                    <div style="font-size: 0.75rem; margin-bottom: 4px;"><strong>Funcionamento:</strong> ${point.hours}</div>
                    <div style="font-size: 0.75rem; margin-bottom: 8px;"><strong>Contato:</strong> ${point.phone}</div>
                    
                    <div style="font-size: 0.75rem; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-bottom: 4px;">
                        <strong style="color: #10b981;">Permitido:</strong>
                        <ul style="margin: 2px 0 6px 0; padding-left: 12px; color: #334155;">
                            ${popupAllowedList}
                        </ul>
                    </div>
                    <div style="font-size: 0.75rem; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                        <strong style="color: #ef4444;">Não permitido:</strong>
                        <ul style="margin: 2px 0 0 0; padding-left: 12px; color: #334155;">
                            ${popupNotAllowedList}
                        </ul>
                    </div>
                </div>
            `;

            const marker = L.marker(point.coords).addTo(map).bindPopup(popupContent);
            mapMarkers.push(marker);

            // Listen to marker click for TTS
            marker.on('click', () => {
                if (ttsActive) {
                    speakText(`${point.name}. Endereço: ${point.address}. Funcionamento: ${point.hours}`);
                }

                // Highlight corresponding sidebar item
                document.querySelectorAll('.point-list-item').forEach(item => {
                    if (parseInt(item.getAttribute('data-id')) === point.id) {
                        item.classList.add('active');
                        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else {
                        item.classList.remove('active');
                    }
                });
            });

            // Build sidebar card lists
            const sidebarAllowedItems = point.allowed.map(item => `<li class="col"><i class="bi bi-check-circle-fill text-success"></i> ${item}</li>`).join('');
            const sidebarNotAllowedItems = point.notAllowed.map(item => `<li class="col"><i class="bi bi-x-circle-fill text-danger"></i> ${item}</li>`).join('');

            // Add sidebar card item
            if (pointListContainer) {
                const card = document.createElement('div');
                card.className = `point-list-item tts-readable`;
                card.setAttribute('data-id', point.id);
                card.innerHTML = `
                    <div class="d-flex align-items-start gap-3">
                        <div class="fs-4 text-emerald" style="color: var(--accent-color);">
                            <i class="bi ${point.icon}"></i>
                        </div>
                        <div class="w-100">
                            <h5 class="fs-6 fw-bold mb-1">${point.name}</h5>
                            <p class="small text-secondary mb-1">${point.address}</p>
                            <div class="small text-warning mb-2"><i class="bi bi-clock"></i> ${point.hours}</div>
                            
                            <div class="mt-2 small border-top border-secondary pt-2">
                                <span class="fw-bold d-block mb-1 text-light">Itens Permitidos:</span>
                                <ul class="list-unstyled mb-2 ps-0 text-secondary row row-cols-1 g-1">
                                    ${sidebarAllowedItems}
                                </ul>
                                <span class="fw-bold d-block mb-1 text-light">Itens NÃO Permitidos:</span>
                                <ul class="list-unstyled mb-0 ps-0 text-secondary row row-cols-1 g-1">
                                    ${sidebarNotAllowedItems}
                                </ul>
                            </div>
                            
                            <button class="speaker-btn mt-2" aria-label="Ouvir informações do ponto de descarte">
                                <i class="bi bi-volume-up"></i> Ouvir endereço
                            </button>
                        </div>
                    </div>
                `;

                card.addEventListener('click', (e) => {
                    // Prevent map panning if clicking speaker button
                    if (e.target.closest('.speaker-btn')) return;

                    // Focus Marker on map
                    map.setView(point.coords, 16);
                    marker.openPopup();

                    // Highlight selected item in list
                    document.querySelectorAll('.point-list-item').forEach(item => item.classList.remove('active'));
                    card.classList.add('active');

                    // Read point details if TTS is active
                    if (ttsActive) {
                        speakText(`${point.name}. Endereço: ${point.address}. Horário: ${point.hours}`);
                    }
                });

                pointListContainer.appendChild(card);
            }
        });
    }

    // Connect map trigger switch inside "Como Descartar" links
    const linkMapTrigger = document.getElementById('link-map-trigger');
    if (linkMapTrigger) {
        linkMapTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('pontos-coleta');
        });
    }

    // ----------------------------------------------------
    // Chart.js - Dashboard Configuration
    // ----------------------------------------------------
    let collectedChart = null;
    let materialsChart = null;

    function initCharts() {
        const ctxCollected = document.getElementById('collectedChart');
        const ctxMaterials = document.getElementById('materialsChart');
        if (!ctxCollected || !ctxMaterials) return;

        // Colors based on contrast
        const isContrast = document.body.classList.contains('high-contrast');
        const gridColor = isContrast ? '#ffff00' : 'rgba(255, 255, 255, 0.05)';
        const textLabelColor = isContrast ? '#ffffff' : '#94a3b8';
        const primaryColor = isContrast ? '#ffff00' : '#10b981';
        const accentColorsList = isContrast
            ? ['#ffffff', '#ffff00', '#00ff00', '#ff0000', '#0000ff']
            : ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

        // E-waste Collected Monthly (Simulated 30,000 population data)
        collectedChart = new Chart(ctxCollected, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Quilos Coletados (kg)',
                    data: [1200, 1450, 1100, 1850, 2200, 2650],
                    backgroundColor: primaryColor,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textLabelColor, font: { family: 'Inter' } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textLabelColor }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textLabelColor }
                    }
                }
            }
        });

        // E-waste Material Composition Recycled
        materialsChart = new Chart(ctxMaterials, {
            type: 'doughnut',
            data: {
                labels: ['Plásticos', 'Metais Ferrosos', 'Cobre', 'Alumínio', 'Metais Preciosos (Ouro/Prata)'],
                datasets: [{
                    data: [42, 35, 12, 8, 3],
                    backgroundColor: accentColorsList,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: textLabelColor, font: { family: 'Inter' } }
                    }
                }
            }
        });
    }

    // ----------------------------------------------------
    // E-waste Impact Calculator
    // ----------------------------------------------------
    const calcSliders = document.querySelectorAll('.calc-slider');

    function updateCalculator() {
        let totalWater = 0;
        let totalSoil = 0;
        let totalWeight = 0;
        let totalDegradation = 0;
        let totalRecovery = 0;

        calcSliders.forEach(slider => {
            const id = slider.id.replace('calc-', '');
            const qty = parseInt(slider.value);

            // Update quantity display bubble
            const qtyBadge = document.getElementById(`${slider.id}-qty`);
            if (qtyBadge) {
                qtyBadge.textContent = qty;
            }

            const metrics = IMPACT_METRICS[id];
            if (metrics) {
                totalWater += qty * metrics.water;
                totalSoil += qty * metrics.soil;
                totalWeight += qty * metrics.weight;
                totalDegradation += qty * metrics.degradation;
                totalRecovery += qty * metrics.recovery;
            }
        });

        // Dynamic formatting helpers to avoid long raw numbers
        const formatWeight = (kg) => {
            if (kg >= 1000) {
                return `${(kg / 1000).toFixed(2).replace('.', ',')} toneladas`;
            }
            return `${kg.toFixed(1).replace('.', ',')} kg`;
        };

        const formatWater = (liters) => {
            if (liters >= 1000000) {
                return `${(liters / 1000000).toFixed(1).replace('.', ',')} milhões de L`;
            } else if (liters >= 1000) {
                return `${(liters / 1000).toFixed(1).replace('.', ',')} mil L`;
            }
            return `${liters} L`;
        };

        const formatSoil = (sqm) => {
            if (sqm >= 1000) {
                return `${(sqm / 1000).toFixed(1).replace('.', ',')} mil m²`;
            }
            return `${sqm} m²`;
        };

        const formatNumber = (num) => num.toLocaleString('pt-BR');

        // Update DOM values
        document.getElementById('metric-weight').textContent = formatWeight(totalWeight);
        document.getElementById('metric-water').textContent = formatWater(totalWater);
        document.getElementById('metric-soil').textContent = formatSoil(totalSoil);
        document.getElementById('metric-degradation').textContent = `Até ${formatNumber(totalDegradation)} anos`;
        document.getElementById('metric-recovery').textContent = `${formatNumber(totalRecovery)} anos`;
    }

    // Attach slider events
    calcSliders.forEach(slider => {
        slider.addEventListener('input', updateCalculator);

        // Announce current state when slider is changed and TTS is active
        slider.addEventListener('change', () => {
            if (ttsActive) {
                const id = slider.id.replace('calc-', '');
                const qty = parseInt(slider.value);
                const label = slider.closest('.mb-3').querySelector('label').textContent.split('(')[0].trim();
                speakText(`${qty} unidades de ${label} selecionados.`);
            }
        });
    });

    // Reset Calculator button
    const btnResetCalc = document.getElementById('btn-reset-calc');
    if (btnResetCalc) {
        btnResetCalc.addEventListener('click', () => {
            calcSliders.forEach(slider => {
                slider.value = 0;
            });
            updateCalculator();
            showToast("Calculadora reiniciada.");
            if (ttsActive) {
                speakText("Calculadora reiniciada.");
            }
        });
    }

    // ----------------------------------------------------
    // Application Initialization
    // ----------------------------------------------------
    // Show home page first
    showSection('inicio');

    // Init Leaflet map
    initLeafletMap();

    // Init charts
    initCharts();

    // Run first calculation
    updateCalculator();
});
