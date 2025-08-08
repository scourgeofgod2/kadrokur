document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTLERİ ---
    const matchSizeSelect = document.getElementById('matchSizeSelect');
    const playerInputsContainer = document.getElementById('player-inputs-container');
    const createTeamsButton = document.getElementById('createTeamsButton');
    const resetButton = document.getElementById('resetButton');
    const downloadButton = document.getElementById('downloadButton');
    const fillRandomButton = document.getElementById('fillRandomButton');
    const footballField = document.getElementById('footballField');
    const analysisContainer = document.getElementById('analysis-container');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    let notificationTimeout;

    // --- OLAY DİNLEYİCİLERİ ---
    matchSizeSelect.addEventListener('change', generatePlayerRows);
    createTeamsButton.addEventListener('click', processAndDisplayTeams);
    resetButton.addEventListener('click', resetAll);
    downloadButton.addEventListener('click', downloadFieldImage);
    fillRandomButton.addEventListener('click', fillWithRandomPlayers);

    // --- BAŞLANGIÇ ---
    generatePlayerRows();

    // =======================================================================
    // --- GÖRSEL ARABİRİM FONKSİYONLARI ---
    // =======================================================================

    /**
     * Displays a custom pop-up notification at the bottom of the screen.
     */
    function showNotification(message, duration = 3000) {
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }

        notificationMessage.textContent = message;
        notification.classList.add('show');

        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }


    // =======================================================================
    // --- ANA KONTROL FONKSİYONLARI ---
    // =======================================================================

    /**
     * Tüm süreci başlatan ana fonksiyon. Her "Oluştur" butonuna basıldığında çalışır.
     */
    function processAndDisplayTeams() {
        clearPreviousResults();
        const players = readAndValidatePlayers();
        if (!players) return;

        const balancedTeams = balanceTeamsWithGoalkeeperLogic(players);
        displayTeamsOnField(balancedTeams);
        displayTeamAnalysis(balancedTeams);
    }

    function resetAll() {
        clearPreviousResults();
        generatePlayerRows();
    }

    function clearPreviousResults() {
        footballField.querySelectorAll('.player-marker, .field-team-name').forEach(el => el.remove());
        analysisContainer.innerHTML = '';
    }

    // =======================================================================
    // --- VERİ OKUMA, DOĞRULAMA VE DENGELEME ALGORİTMALARI ---
    // =======================================================================

    /**
     * Input alanlarındaki oyuncu bilgilerini okur, doğrular ve işlenmeye hazır hale getirir.
     */
    function readAndValidatePlayers() {
        const playerCards = playerInputsContainer.querySelectorAll('.player-card'); // Use new class
        const players = [];
        const invalidInputs = [];
        const seenNames = new Set();
        let goalkeeperCount = 0;

        // Clear previous errors from name inputs
        playerCards.forEach(card => card.querySelector('.player-name-input').classList.remove('error'));

        playerCards.forEach((card, index) => { // Iterate over cards
            const nameInput = card.querySelector('.player-name-input');
            const name = nameInput.value.trim();

            if (name === '') {
                invalidInputs.push(nameInput);
            } else if (seenNames.has(name.toLowerCase())) {
                invalidInputs.push(nameInput);
            }
            seenNames.add(name.toLowerCase());

            const positionSelect = card.querySelector('.player-position-select');
            if (positionSelect.value === 'GK') goalkeeperCount++;

            // Reading from range sliders works the same way, .value gives the number as a string
            const pace = Math.max(1, Math.min(100, parseInt(card.querySelector('.player-pace-input').value) || 50));
            const technique = Math.max(1, Math.min(100, parseInt(card.querySelector('.player-tech-input').value) || 50));
            const passing = Math.max(1, Math.min(100, parseInt(card.querySelector('.player-pass-input').value) || 50));
            const shooting = Math.max(1, Math.min(100, parseInt(card.querySelector('.player-shot-input').value) || 50));
            const defense = Math.max(1, Math.min(100, parseInt(card.querySelector('.player-def-input').value) || 50));

            players.push({
                id: `p${index}`, name, pace, technique, passing, shooting, defense,
                power: calculateOverallPower({ pace, technique, passing, shooting, defense, position: positionSelect.value }),
                position: positionSelect.value
            });
        });

        if (invalidInputs.length > 0) {
            showNotification("İsimleri girin veya benzersiz olduklarından emin olun.");
            invalidInputs.forEach(input => input.classList.add('error'));
            return null;
        }
        if (goalkeeperCount > 2) {
            showNotification("En fazla 2 kaleci seçebilirsiniz.");
            // Maybe add some visual feedback here in the future
            return null;
        }
        return players;
    }

    /**
     * Bir oyuncunun genel gücünü, mevkisine göre ağırlıklı ortalama alarak hesaplar.
     */
    function calculateOverallPower(stats) {
        const { pace, technique, passing, shooting, defense, position } = stats;
        let power = 0;
        switch (position) {
            case 'GK': power = (defense * 0.6) + (passing * 0.2) + (pace * 0.1) + (technique * 0.1); break;
            case 'DEF': power = (defense * 0.5) + (pace * 0.2) + (passing * 0.2) + (technique * 0.1); break;
            case 'MID': power = (passing * 0.35) + (technique * 0.3) + (pace * 0.15) + (shooting * 0.1) + (defense * 0.1); break;
            case 'FWD': power = (shooting * 0.4) + (pace * 0.3) + (technique * 0.2) + (passing * 0.1); break;
            default: power = (pace + technique + passing + shooting + defense) / 5;
        }
        return Math.round(power);
    }

    /**
     * Takımları oluştururken aynı güçteki oyuncuları karıştırarak rastgelelik ekler.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function balanceTeamsWithGoalkeeperLogic(players) {
        const goalkeepers = players.filter(p => p.position === 'GK');
        const outfieldPlayers = players.filter(p => p.position !== 'GK');
        let teamA = [], teamB = [];

        if (goalkeepers.length > 0) { teamA.push(goalkeepers.shift()); }
        if (goalkeepers.length > 0) { teamB.push(goalkeepers.shift()); }

        // Aynı güçteki oyuncuları karıştırarak rastgelelik kat
        const sortedOutfielders = outfieldPlayers.sort((a, b) => b.power - a.power);
        const shuffledOutfielders = shuffleArray(sortedOutfielders);

        let teamAPower = teamA.reduce((sum, p) => sum + p.power, 0);
        let teamBPower = teamB.reduce((sum, p) => sum + p.power, 0);

        shuffledOutfielders.forEach(player => {
            if (teamAPower <= teamBPower) {
                teamA.push(player);
                teamAPower += player.power;
            } else {
                teamB.push(player);
                teamBPower += player.power;
            }
        });
        return { teamA, teamB };
    }

    // =======================================================================
    // --- GÖRSELLEŞTİRME VE DİĞER FONKSİYONLAR (TAM VE EKSİKSİZ) ---
    // =======================================================================

    function displayTeamsOnField(teams) {
        // Clear only markers, not team names if they already exist
        footballField.querySelectorAll('.player-marker').forEach(el => el.remove());
        if (!footballField.querySelector('.field-team-name')) {
            footballField.insertAdjacentHTML('beforeend', `<div class="field-team-name team1">Maviler</div>`);
            footballField.insertAdjacentHTML('beforeend', `<div class="field-team-name team2">Kırmızılar</div>`);
        }

        const teamAPositions = calculatePositionsForTeam(teams.teamA, 'A');
        teams.teamA.forEach(player => {
            const position = teamAPositions[player.position].shift();
            createPlayerMarker(player, position, 'team1'); // Updated call
        });

        const teamBPositions = calculatePositionsForTeam(teams.teamB, 'B');
        teams.teamB.forEach(player => {
            const position = teamBPositions[player.position].shift();
            createPlayerMarker(player, position, 'team2'); // Updated call
        });
    }

    function calculatePositionsForTeam(teamPlayers, side) {
        const isMobile = window.innerWidth <= 900;
        const positions = { GK: [], DEF: [], MID: [], FWD: [] };

        if (isMobile) {
            // Vertical layout for mobile
            const y_offsets = (side === 'A') ? { GK: 8, DEF: 28, MID: 45, FWD: 60 } : { GK: 92, DEF: 72, MID: 55, FWD: 40 };

            ['GK', 'DEF', 'MID', 'FWD'].forEach(posType => {
                const playersInPosition = teamPlayers.filter(p => p.position === posType);
                const count = playersInPosition.length;
                if (count === 0) return;
                const x_gap = 100 / (count + 1); // Spread players horizontally
                for (let i = 0; i < count; i++) {
                    positions[posType].push({ x: x_gap * (i + 1), y: y_offsets[posType] });
                }
            });
        } else {
            // Horizontal layout for desktop (original logic)
            const x_offsets = (side === 'A') ? { GK: 8, DEF: 25, MID: 40, FWD: 45 } : { GK: 92, DEF: 75, MID: 60, FWD: 55 };

            ['GK', 'DEF', 'MID', 'FWD'].forEach(posType => {
                const playersInPosition = teamPlayers.filter(p => p.position === posType);
                const count = playersInPosition.length;
                if (count === 0) return;
                const y_gap = 100 / (count + 1); // Spread players vertically
                for (let i = 0; i < count; i++) {
                    positions[posType].push({ x: x_offsets[posType], y: y_gap * (i + 1) });
                }
            });
        }

        return positions;
    }

    function displayTeamAnalysis(teams) {
        const teamA_Card = createAnalysisCard(teams.teamA, 'Maviler', 'team1');
        const teamB_Card = createAnalysisCard(teams.teamB, 'Kırmızılar', 'team2');
        analysisContainer.appendChild(teamA_Card);
        analysisContainer.appendChild(teamB_Card);
        setTimeout(() => {
            teamA_Card.classList.add('visible');
            teamB_Card.classList.add('visible');
        }, 100);
    }

    function createAnalysisCard(team, name, teamClass) {
        if (team.length === 0) return document.createElement('div');
        const getAverage = (attr) => Math.round(team.reduce((sum, p) => sum + p[attr], 0) / team.length);
        const avgPower = getAverage('power');
        const avgPace = getAverage('pace');
        const avgTech = getAverage('technique');
        const avgPass = getAverage('passing');
        const avgShot = getAverage('shooting');
        const avgDef = getAverage('defense');
        const tactic = generateTacticForTeam({ avgPace, avgTech, avgPass, avgShot, avgDef }, team);

        const card = document.createElement('div');
        card.className = `team-analysis-card ${teamClass}`;
        card.innerHTML = `
            <h3>${name} Analizi</h3>
            <div class="stats-grid">
                <div class="stat-item"><div class="value">${avgPower}</div><div class="label">Genel</div></div>
                <div class="stat-item"><div class="value">${avgPace}</div><div class="label">Hız</div></div>
                <div class="stat-item"><div class="value">${avgTech}</div><div class="label">Teknik</div></div>
                <div class="stat-item"><div class="value">${avgPass}</div><div class="label">Pas</div></div>
                <div class="stat-item"><div class="value">${avgShot}</div><div class="label">Şut</div></div>
                <div class="stat-item"><div class="value">${avgDef}</div><div class="label">Defans</div></div>
            </div>
            <div class="tactic-item">
                <div class="label"><i class="fas fa-bullseye"></i> Önerilen Taktik:</div>
                <div class="value">${tactic}</div>
            </div>
        `;
        return card;
    }

    /**
     * Her bir yetenek (stat) için bir kontrol elemanı (slider ve değer göstergesi) oluşturur.
     */
    function createStatControl(label, statName, defaultValue, playerIndex) {
        const statId = `player-${playerIndex}-${statName}-input`; // Benzersiz ID
        return `
        <div class="stat-control">
            <div class="stat-header">
                <label for="${statId}">${label}</label>
                <span class="stat-value">${defaultValue}</span>
            </div>
            <input type="range" id="${statId}" class="player-stat-slider player-${statName}-input" min="1" max="100" value="${defaultValue}">
        </div>
    `;
    }

    function generatePlayerRows() {
        const playerCount = parseInt(matchSizeSelect.value.split('-')[0]) * 2;
        playerInputsContainer.innerHTML = ''; // Clear existing players

        for (let i = 1; i <= playerCount; i++) {
            const card = document.createElement('div');
            card.className = 'player-card';

            card.innerHTML = `
            <div class="player-card-header">
                <i class="fas fa-user-circle player-icon"></i>
                <input type="text" class="player-name-input" placeholder="Oyuncu ${i}">
                <div class="position-selector-wrapper">
                    <select class="player-position-select">
                        <option value="GK">KL</option>
                        <option value="DEF">DF</option>
                        <option value="MID" selected>OS</option>
                        <option value="FWD">FV</option>
                    </select>
                </div>
            </div>
            <div class="player-card-body">
                <div class="stat-grid">
                    ${createStatControl('HIZ', 'pace', 75, i)}
                    ${createStatControl('TEK', 'tech', 75, i)}
                    ${createStatControl('PAS', 'pass', 75, i)}
                    ${createStatControl('ŞUT', 'shot', 75, i)}
                    ${createStatControl('DEF', 'def', 75, i)}
                </div>
            </div>
        `;

            playerInputsContainer.appendChild(card);

            // Add event listener to the name input for error handling
            card.querySelector('.player-name-input').addEventListener('input', (e) => e.target.classList.remove('error'));

            // Add event listeners for all sliders in this card
            card.querySelectorAll('.player-stat-slider').forEach(slider => {
                const statControl = slider.closest('.stat-control');
                const valueSpan = statControl.querySelector('.stat-value');
                slider.addEventListener('input', (e) => {
                    if (valueSpan) valueSpan.textContent = e.target.value;
                });
            });
        }
    }

    function createPlayerMarker(player, position, teamClass) {
        if (!player || !position) return;
        const marker = document.createElement('div');
        marker.className = `player-marker ${teamClass}`;
        marker.style.left = `${position.x}%`;
        marker.style.top = `${position.y}%`;

        marker.innerHTML = `
            <div class="jersey-icon">
                <i class="fas fa-tshirt"></i>
            </div>
            <span class="marker-player-name">${player.name.split(' ')[0]}</span>
        `;
        footballField.appendChild(marker);
        makePlayerDraggable(marker);
    }

    function makePlayerDraggable(element) {
        element.onmousedown = function (event) {
            if (event.button !== 0) return;
            event.preventDefault();
            const fieldRect = footballField.getBoundingClientRect();
            function onMouseMove(moveEvent) {
                let x = ((moveEvent.clientX - fieldRect.left) / fieldRect.width) * 100;
                let y = ((moveEvent.clientY - fieldRect.top) / fieldRect.height) * 100;
                x = Math.max(4, Math.min(96, x));
                y = Math.max(5, Math.min(95, y));
                element.style.left = `${x}%`;
                element.style.top = `${y}%`;
            }
            function onMouseUp() { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        element.ondragstart = () => false;
    }

    function generateTacticForTeam(stats, team) {
        const { avgPace, avgTech, avgPass, avgShot, avgDef } = stats;
        const defenderCount = team.filter(p => p.position === 'DEF').length;
        if (avgShot > 80) return "Fırsat buldukça kaleyi yokla, uzaktan şut çek.";
        if (avgPace > 80) return "Hızlı kanat oyuncularıyla rakip defansın arkasına koşular yap.";
        if (avgPass > 80 && avgTech > 80) return "Kısa paslarla topa sahip ol ve oyunu kontrol et.";
        if (defenderCount >= team.length / 2 && avgDef > 75) return "Kompakt savunma yap, kapılan toplarla hızlı hücuma çık.";
        return "Dengeli ve kontrollü oyna, rakibin hatalarını kolla.";
    }

    function fillWithRandomPlayers() {
        const names = ["Ahmet", "Burak", "Cem", "Deniz", "Emir", "Fatih", "Gökhan", "Hakan", "İlker", "Kerem", "Levent", "Mert", "Nasuh", "Ömer", "Polat", "Serkan", "Tuna", "Ufuk", "Volkan", "Yasin", "Ali", "Veli", "Can", "Efe", "Kaan"];

        // Shuffle names for uniqueness
        const shuffledNames = shuffleArray([...names]);

        const playerCards = playerInputsContainer.querySelectorAll('.player-card');

        playerCards.forEach((card, index) => {
            const nameInput = card.querySelector('.player-name-input');

            if (nameInput.value.trim() === '') {
                // Assign a unique name
                nameInput.value = shuffledNames.pop() || `Oyuncu ${index + 1}`;

                // Update stats
                card.querySelectorAll('.player-stat-slider').forEach(slider => {
                    const randomValue = Math.floor(Math.random() * 41) + 50; // Random value between 50 and 90
                    slider.value = randomValue;

                    // Update the visual display of the stat value
                    const statControl = slider.closest('.stat-control');
                    const valueSpan = statControl.querySelector('.stat-value');
                    if (valueSpan) {
                        valueSpan.textContent = randomValue;
                    }
                });
            }
        });
    }

    function downloadFieldImage() {
        downloadButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Hazırlanıyor...`;
        downloadButton.disabled = true;
        html2canvas(document.querySelector('.main-content-area'), { scale: 2, backgroundColor: null })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = 'kadrokur-mac-plani.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => console.error('İndirme hatası:', err))
            .finally(() => {
                downloadButton.innerHTML = `<i class="fas fa-camera"></i> İndir`;
                downloadButton.disabled = false;
            });
    }
});