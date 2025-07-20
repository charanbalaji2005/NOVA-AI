document.addEventListener('DOMContentLoaded', () => {
    // --- 3D Background Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg-canvas'),
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    camera.position.z = 1;

    function animate() {
        requestAnimationFrame(animate);
        starField.rotation.x += 0.0001;
        starField.rotation.y += 0.0001;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });


    // --- Chat App Logic ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContent = document.getElementById('chat-content');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatHistoryContainer = document.getElementById('chat-history-container');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const suggestBtn = document.getElementById('suggest-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const summarizeMenuBtn = document.getElementById('summarize-menu-btn');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const voiceToggleCheckbox = document.getElementById('voice-toggle-checkbox');
    const profileSectionClickable = document.getElementById('profile-section-clickable');
    const profileMenu = document.getElementById('profile-menu');
    const newChatMenuBtn = document.getElementById('new-chat-menu-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const modal = document.getElementById('context-modal');
    const modalTitle = document.getElementById('modal-title');
    const renameView = document.getElementById('rename-view');
    const confirmationView = document.getElementById('confirmation-view');
    const summaryView = document.getElementById('summary-view');
    const modalToolbarContainer = document.getElementById('modal-toolbar-container');
    const renameInput = document.getElementById('rename-input');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const qrBtn = document.getElementById('qr-btn');
    const qrPopup = document.getElementById('qr-popup');
    const qrCodeImg = document.getElementById('qr-code-img');

    // --- API Configuration ---
    const API_KEY = "AIzaSyD6t7HmtN2ahjVXpaNG21wEUBmD4-F1rYg"; // IMPORTANT: REPLACE WITH YOUR KEY
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
    
    let conversations = {};
    let currentChatId = null;
    let currentModalAction = null;
    let currentModalChatId = null;
    let uploadedImage = null;

    // --- Event Listeners ---
    chatInput.addEventListener('input', () => {
        sendBtn.disabled = chatInput.value.trim() === '' && !uploadedImage;
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) sendMessage();
        }
    });

    newChatBtn.addEventListener('click', startNewChat);

    const toggleSidebar = () => document.body.classList.toggle('sidebar-closed');
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    sidebarCloseBtn.addEventListener('click', () => document.body.classList.add('sidebar-closed'));
    
    suggestBtn.addEventListener('click', handleSuggestReplyClick);
    uploadBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', handleImageUpload);

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    });

    summarizeMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSummarizeClick();
        settingsMenu.style.display = 'none';
    });
    
    themeToggleCheckbox.addEventListener('change', () => {
        const isLight = themeToggleCheckbox.checked;
        document.body.classList.toggle('light-theme', isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // Switch highlight.js theme
        document.getElementById('highlight-dark-theme').disabled = isLight;
        document.getElementById('highlight-light-theme').disabled = !isLight;
    });

    voiceToggleCheckbox.addEventListener('change', () => {
        const isEnabled = voiceToggleCheckbox.checked;
        localStorage.setItem('voiceEnabled', isEnabled ? 'true' : 'false');
        if (!isEnabled) {
            window.speechSynthesis.cancel(); // Stop speaking if turned off
        }
    });

    profileSectionClickable.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    window.addEventListener('click', (e) => {
        if (profileMenu && !profileMenu.contains(e.target) && !profileSectionClickable.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
        if (settingsMenu && !settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsMenu.style.display = 'none';
        }
        document.querySelectorAll('.context-menu').forEach(menu => {
            if (!menu.parentElement.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    });
    
    newChatMenuBtn.addEventListener('click', (e) => { e.preventDefault(); startNewChat(); });
    clearHistoryBtn.addEventListener('click', (e) => { e.preventDefault(); showClearHistoryModal(); });
    logoutBtn.addEventListener('click', (e) => { e.preventDefault(); showClearHistoryModal('Logout'); });

    modalCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modalConfirmBtn.classList.remove('delete');
    });
    modalConfirmBtn.addEventListener('click', handleModalConfirm);

    qrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (qrPopup.classList.contains('hidden')) {
            generateQRCode();
            qrPopup.classList.remove('hidden');
        } else {
            qrPopup.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!qrBtn.contains(e.target) && !qrPopup.contains(e.target)) {
            qrPopup.classList.add('hidden');
        }
    });

    function generateQRCode() {
        // In a real app, you would generate a QR code for the current chat
        // For demo purposes, we'll use a placeholder
        qrCodeImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + 
            encodeURIComponent(window.location.href + '?chat=' + currentChatId);
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const isLight = savedTheme === 'light';
        document.body.classList.toggle('light-theme', isLight);
        themeToggleCheckbox.checked = isLight;
        
        // Apply highlight.js theme on load
        document.getElementById('highlight-dark-theme').disabled = isLight;
        document.getElementById('highlight-light-theme').disabled = !isLight;
    }

    function applySavedVoiceSetting() {
        const savedVoiceSetting = localStorage.getItem('voiceEnabled');
        const isEnabled = savedVoiceSetting === 'true';
        voiceToggleCheckbox.checked = isEnabled;
    }

    function showInfoModal(title, message) {
        currentModalAction = 'info';
        modal.style.display = 'flex';
        modalTitle.textContent = title;
        renameView.style.display = 'none';
        summaryView.style.display = 'none';
        confirmationView.style.display = 'block';
        confirmationView.textContent = message;
        modalConfirmBtn.style.display = 'none';
        modalToolbarContainer.style.display = 'none';
        modalCancelBtn.textContent = 'Close';
    }
    
    function formatBotMessage(text) {
        if (!text) return '';

        const codeBlocks = [];
        let safeText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push({ lang: lang || 'plaintext', code: code });
            return placeholder;
        });

        safeText = safeText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        safeText = safeText.replace(/^\s*([*+-])\s+(.*)/gm, '<ul><li>$2</li></ul>');
        safeText = safeText.replace(/<\/ul>\s*<ul>/g, '');
        safeText = safeText.replace(/\n/g, '<br>');

        safeText = safeText.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
            const block = codeBlocks[parseInt(index)];
            const escapedCode = block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<pre><code class="language-${block.lang}">${escapedCode.trim()}</code></pre>`;
        });

        return safeText;
    }

    function sendMessage() {
        window.speechSynthesis.cancel();
        const messageText = chatInput.value.trim();
        if (messageText === '' && !uploadedImage) return;

        if (!currentChatId || !conversations[currentChatId]) {
            startNewChat(false);
        }
        
        const welcomeScreen = chatContent.querySelector('.welcome-screen');
        if (welcomeScreen) welcomeScreen.remove();

        addMessageToChat('user', messageText, false, uploadedImage ? uploadedImage.dataUrl : null, Date.now());
        
        const messagePayload = { role: 'user', parts: [{ text: messageText }], id: Date.now() };
        if (uploadedImage) {
            messagePayload.image = uploadedImage;
        }
        conversations[currentChatId].messages.push(messagePayload);
        
        if (conversations[currentChatId].messages.length === 1) {
            conversations[currentChatId].title = messageText.substring(0, 30) || "Image Analysis";
            updateChatHistory();
        }

        chatInput.value = '';
        sendBtn.disabled = true;
        chatInput.style.height = 'auto';
        clearImagePreview();
        
        getBotResponse();
        saveConversations();
    }

    async function getBotResponse(regenerateHistory = null) {
        if (API_KEY === "") {
            const errorMessage = "Error: API Key is missing. Please add your Gemini API key in the script.";
            addMessageToChat('bot', errorMessage, false, null, Date.now());
            speak(errorMessage);
            return;
        }
        
        const historyToUse = regenerateHistory || conversations[currentChatId].messages;
        
        let loadingMessage;
        if(!regenerateHistory){
           addMessageToChat('bot', '', true);
           loadingMessage = chatContent.querySelector('.loading');
        }

        try {
            const contents = historyToUse.map(msg => {
                const parts = [{ text: msg.parts[0].text || "" }];
                if (msg.image) {
                    parts.push({ inlineData: { mimeType: msg.image.mimeType, data: msg.image.base64 } });
                }
                return { role: msg.role === 'model' ? 'model' : 'user', parts };
            });

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API request failed');
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
                 throw new Error("Invalid response from API.");
            }
            
            const botText = data.candidates[0].content.parts[0].text;
            speak(botText);
            const botMessageId = Date.now();
            
            if(loadingMessage) loadingMessage.remove();
            
            const messageElement = addMessageToChat('bot', '', false, null, botMessageId);
            const textContentDiv = messageElement.querySelector('.text-content');
            const messageContentWrapper = messageElement.querySelector('.message-content-wrapper');

            await streamMessage(textContentDiv, botText, async () => {
                conversations[currentChatId].messages.push({ role: 'model', parts: [{ text: botText }], id: botMessageId });
                saveConversations();

                const timestamp = document.createElement('div');
                timestamp.className = 'message-timestamp';
                timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                messageContentWrapper.appendChild(timestamp);

                const toolbar = createMessageToolbar(botText, botMessageId);
                messageContentWrapper.appendChild(toolbar);
                chatContent.scrollTop = chatContent.scrollHeight;
            });


        } catch (error) {
            console.error('Error fetching bot response:', error);
            const loadingMessage = chatContent.querySelector('.loading');
            if(loadingMessage) loadingMessage.remove();
            const errorMessage = `Error: ${error.message}`;
            addMessageToChat('bot', errorMessage, false, null, Date.now());
            speak(errorMessage);
        }
    }

    async function streamMessage(element, fullText, onComplete) {
        const formattedHtml = formatBotMessage(fullText);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedHtml;

        const lineDelay = 70; 
        const wordDelay = 30;

        const nodes = Array.from(tempDiv.childNodes);

        for (const node of nodes) {
            if (node.nodeName === 'PRE') {
                const codeBlock = node.querySelector('code');
                const codeText = codeBlock.textContent;

                const preElement = document.createElement('pre');
                const codeElement = document.createElement('code');
                codeElement.className = codeBlock.className;
                preElement.appendChild(codeElement);
                element.appendChild(preElement);

                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                copyBtn.className = 'copy-code-btn';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(codeText).then(() => {
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
                    });
                };
                preElement.appendChild(copyBtn);

                const lines = codeText.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    codeElement.textContent += lines[i] + (i === lines.length - 1 ? '' : '\n');
                    hljs.highlightElement(codeElement);
                    chatContent.scrollTop = chatContent.scrollHeight;
                    await new Promise(resolve => setTimeout(resolve, lineDelay));
                }
            } 
            else {
                const tempContainer = document.createElement('div');
                tempContainer.appendChild(node.cloneNode(true));
                const htmlString = tempContainer.innerHTML;

                const currentTextElement = element.appendChild(document.createElement('span'));
                const parts = htmlString.split(/(<[^>]+>|\s+)/g).filter(p => p);

                for (const part of parts) {
                    currentTextElement.innerHTML += part;
                    chatContent.scrollTop = chatContent.scrollHeight;
                    if (!part.startsWith('<') && part.trim().length > 0) {
                        await new Promise(resolve => setTimeout(resolve, wordDelay));
                    }
                }
                
                while (currentTextElement.firstChild) {
                    element.insertBefore(currentTextElement.firstChild, currentTextElement);
                }
                element.removeChild(currentTextElement);
            }
        }

        if (onComplete) {
            await onComplete();
        }
    }
    
    function addMessageToChat(sender, text, isLoading = false, imageSrc = null, messageId) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        if (messageId) messageDiv.dataset.messageId = messageId;
        if (isLoading) messageDiv.classList.add('loading');
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'user' ? 'N' : '<i class="fas fa-brain"></i>';

        const messageContentWrapper = document.createElement('div');
        messageContentWrapper.className = 'message-content-wrapper';
        
        const textContentDiv = document.createElement('div');
        textContentDiv.className = 'text-content';

        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.style.maxWidth = '200px';
            img.style.borderRadius = '8px';
            img.style.marginBottom = text ? '8px' : '0';
            textContentDiv.appendChild(img);
        }

        if (isLoading) {
            textContentDiv.innerHTML += `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        } else if (text) { 
            const formattedText = sender === 'bot' ? formatBotMessage(text) : text;
            textContentDiv.innerHTML += formattedText;
        }
        
        messageDiv.appendChild(avatar);
        messageContentWrapper.appendChild(textContentDiv);
        
        if (!isLoading && sender !== 'bot' || (sender === 'bot' && text)) {
            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messageContentWrapper.appendChild(timestamp);

            if(text){
                if (sender === 'user') {
                    const toolbar = createUserMessageToolbar(text);
                    messageContentWrapper.appendChild(toolbar);
                } else { 
                     const toolbar = createMessageToolbar(text, messageId);
                     messageContentWrapper.appendChild(toolbar);
                }
            }
        }
        
        messageDiv.appendChild(messageContentWrapper);
        chatContent.appendChild(messageDiv);
        
        textContentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            const pre = block.parentElement;
            if (!pre.querySelector('.copy-code-btn')) {
                const code = block.textContent;
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                copyBtn.className = 'copy-code-btn';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(code).then(() => {
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
                    });
                };
                pre.appendChild(copyBtn);
            }
        });

        chatContent.scrollTop = chatContent.scrollHeight;
        return messageDiv;
    }
    
    async function handleSummarizeClick() {
        const chat = conversations[currentChatId];
        if (!chat || chat.messages.length === 0) {
            showInfoModal('Summary', 'There is no conversation to summarize yet.');
            return;
        }
        
        showSummaryModal('Loading summary...');
        
        const conversationText = chat.messages.map(m => `${m.role}: ${m.parts[0].text}`).join('\n');
        const prompt = [{
            role: 'user',
            parts: [{ text: `Please provide a concise summary of the following conversation:\n\n${conversationText}` }]
        }];

        const summary = await getBotResponseForTask(prompt);
        speak(summary);
        
        if(summary) {
            showSummaryModal(summary, 'Chat Summary');
        } else {
            showSummaryModal('Failed to generate summary.', 'Error');
        }
    }
    
    async function handleSuggestReplyClick() {
        const chat = conversations[currentChatId];
        const lastMessage = chat ? chat.messages[chat.messages.length - 1] : null;

        if (!lastMessage || lastMessage.role !== 'model') {
            showInfoModal('Suggestion', 'Let the bot respond first before asking for a suggestion.');
            return;
        }
        
        suggestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        suggestBtn.disabled = true;

        const prompt = [{
            role: 'user',
            parts: [{ text: `Based on this statement: "${lastMessage.parts[0].text}", suggest a short, relevant question or reply a user could send next. Provide only the reply text itself, without quotation marks.` }]
        }];
        
        const suggestion = await getBotResponseForTask(prompt);
        
        if (suggestion) {
            chatInput.value = suggestion.replace(/"/g, '');
            chatInput.focus();
            sendBtn.disabled = false;
        } else {
            showInfoModal('Suggestion', 'Could not generate a suggestion.');
        }
        
        suggestBtn.innerHTML = '✨';
        suggestBtn.disabled = false;
    }

    function createUserMessageToolbar(text) {
        const toolbar = document.createElement('div');
        toolbar.className = 'message-toolbar';
        
        const copyBtn = document.createElement('button');
        copyBtn.title = 'Copy';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            const icon = copyBtn.querySelector('i');
            icon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => icon.classList.replace('fa-check', 'fa-copy'), 2000);
        };

        toolbar.appendChild(copyBtn);
        return toolbar;
    }
    
    function handleSpeakButtonClick(button, text) {
        const icon = button.querySelector('i');
        const isCurrentlySpeaking = icon.classList.contains('fa-stop');

        window.speechSynthesis.cancel();
        document.querySelectorAll('.speak-btn i').forEach(i => {
            i.classList.remove('fa-stop');
            i.classList.add('fa-volume-up');
        });

        if (!isCurrentlySpeaking) {
            speak(text, () => {
                icon.classList.remove('fa-stop');
                icon.classList.add('fa-volume-up');
            }, true);
            icon.classList.remove('fa-volume-up');
            icon.classList.add('fa-stop');
        }
    }

    function createMessageToolbar(text, messageId) {
        const toolbar = document.createElement('div');
        toolbar.className = 'message-toolbar';

        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.title = 'Read aloud';
        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        speakBtn.onclick = (e) => handleSpeakButtonClick(e.currentTarget, text);
        
        const copyBtn = createUserMessageToolbar(text).querySelector('button');

        const regenBtn = document.createElement('button');
        regenBtn.title = 'Regenerate';
        regenBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        if (messageId !== 'summary') {
            regenBtn.onclick = () => handleRegenerate(messageId);
        } else {
            regenBtn.style.display = 'none';
        }
        
        const likeBtn = document.createElement('button');
        likeBtn.title = 'Like';
        likeBtn.innerHTML = '<i class="far fa-thumbs-up"></i>';
        likeBtn.onclick = (e) => handleFeedback(e.currentTarget, 'like');

        const dislikeBtn = document.createElement('button');
        dislikeBtn.title = 'Dislike';
        dislikeBtn.innerHTML = '<i class="far fa-thumbs-down"></i>';
        dislikeBtn.onclick = (e) => handleFeedback(e.currentTarget, 'dislike');
        
        const translateBtnWrapper = document.createElement('div');
        translateBtnWrapper.style.position = 'relative';
        const translateBtn = document.createElement('button');
        translateBtn.title = 'Translate';
        translateBtn.innerHTML = '<i class="fas fa-language"></i>';
        
        const translateMenu = createMenu(['Spanish','English', 'French', 'German', 'Japanese', 'Hindi', 'Chinese', 'Arabic', 'Russian'], (lang) => {
            handleTranslate(text, lang, toolbar.parentElement);
        });

        translateBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.context-menu').forEach(menu => menu.style.display = 'none');
            translateMenu.style.display = translateMenu.style.display === 'block' ? 'none' : 'block';
        };

        translateBtnWrapper.appendChild(translateBtn);
        translateBtnWrapper.appendChild(translateMenu);

        toolbar.appendChild(speakBtn);
        toolbar.appendChild(copyBtn);
        toolbar.appendChild(regenBtn);
        toolbar.appendChild(likeBtn);
        toolbar.appendChild(dislikeBtn);
        toolbar.appendChild(translateBtnWrapper);

        return toolbar;
    }

    function createMenu(items, callback) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        items.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.textContent = item;
            itemButton.onclick = (e) => {
                e.stopPropagation();
                callback(item);
                menu.style.display = 'none';
            };
            menu.appendChild(itemButton);
        });
        return menu;
    }

    async function handleTranslate(originalContent, language, messageContentWrapper) {
         let translationContainer = messageContentWrapper.querySelector('.translation-container');
         if (!translationContainer) {
             translationContainer = document.createElement('div');
             translationContainer.className = 'translation-container';
             translationContainer.style.borderTop = '1px solid var(--border-color)';
             translationContainer.style.marginTop = '8px';
             translationContainer.style.paddingTop = '8px';
             messageContentWrapper.appendChild(translationContainer);
         }
         
         translationContainer.innerHTML = `<p style="font-size: 12px; color: var(--text-secondary);">Translating to ${language}...</p>`;
         
         const prompt = [{ role: 'user', parts: [{ text: `Translate the following text to ${language}. Provide only the translation, without any additional commentary or quotation marks.\n\nText: "${originalContent}"` }] }];
         const translatedText = await getBotResponseForTask(prompt);
         
         translationContainer.innerHTML = `
             <p style="font-size: 12px; font-weight: bold; color: var(--text-secondary);">${language} Translation:</p>
             <p>${translatedText || "Translation failed."}</p>
         `;
    }

    function handleFeedback(button, type) {
        const toolbar = button.parentElement;
        const like = toolbar.querySelector('button[title="Like"] i');
        const dislike = toolbar.querySelector('button[title="Dislike"] i');

        if (button.classList.contains('active')) {
            button.classList.remove('active');
            like.className = 'far fa-thumbs-up';
            dislike.className = 'far fa-thumbs-down';
            like.style.color = '';
            dislike.style.color = '';
        } else {
            toolbar.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            like.className = (type === 'like') ? 'fas fa-thumbs-up' : 'far fa-thumbs-up';
            dislike.className = (type === 'dislike') ? 'fas fa-thumbs-down' : 'far fa-thumbs-down';
            like.style.color = (type === 'like') ? 'var(--accent-color-start)' : '';
            dislike.style.color = (type === 'dislike') ? 'var(--danger-color)' : '';
        }
    }
    
    async function handleRegenerate(messageId) {
        window.speechSynthesis.cancel();
        const chat = conversations[currentChatId];
        const messageIndex = chat.messages.findIndex(m => String(m.id) === String(messageId));

        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) messageElement.remove();

        const historyForRegen = chat.messages.slice(0, messageIndex);
        chat.messages = historyForRegen; 
        
        await getBotResponse(historyForRegen);
    }
    
    async function getBotResponseForTask(promptContents) {
        if (API_KEY === "") return "API Key not configured.";
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: promptContents })
            });
            if (!response.ok) {
               const errorData = await response.json();
               throw new Error(errorData.error.message || 'API request failed');
            }
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) return null;
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Error in getBotResponseForTask:", error);
            return null;
        }
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            const dataUrl = reader.result;
            uploadedImage = {
                base64: base64String,
                mimeType: file.type,
                dataUrl: dataUrl
            };
            
            imagePreviewContainer.innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <img src="${dataUrl}" style="max-height: 60px; border-radius: 8px;" />
                    <button onclick="clearImagePreview(event)" style="position: absolute; top: -5px; right: -5px; background: #e53e3e; color: white; border-radius: 50%; width: 20px; height: 20px; border: none; cursor: pointer; font-size: 12px; line-height: 20px; display:flex; align-items:center; justify-content:center;">&times;</button>
                </div>
            `;
            imagePreviewContainer.style.display = 'block';
            sendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    window.clearImagePreview = (e) => {
        if(e) e.stopPropagation();
        uploadedImage = null;
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.style.display = 'none';
        imageUploadInput.value = '';
        sendBtn.disabled = chatInput.value.trim() === '';
    }

    function startNewChat(clearContent = true) {
        window.speechSynthesis.cancel();
        const newChatId = `chat_${Date.now()}`;
        currentChatId = newChatId;
        conversations[currentChatId] = { id: newChatId, title: 'New Chat', messages: [] };
        
        if(clearContent) {
            chatContent.innerHTML = '';
            showWelcomeScreen();
        }

        updateChatHistory();
        setActiveChat(currentChatId);
        saveConversations();
        profileMenu.style.display = 'none';
    }
    
    function showWelcomeScreen() {
        chatContent.innerHTML = ''; 
        const template = document.getElementById('welcome-screen-template');
        const welcomeScreenNode = template.content.cloneNode(true);
        chatContent.appendChild(welcomeScreenNode);
        
        chatContent.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                chatInput.value = prompt;
                sendBtn.disabled = false;
                sendMessage();
            });
        });
    }

    function updateChatHistory() {
        chatHistoryContainer.innerHTML = '';
        const chats = Object.values(conversations).sort((a, b) => b.id.split('_')[1] - a.id.split('_')[1]);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        const groups = { today: [], week: [], older: [] };

        chats.forEach(chat => {
            const chatDate = new Date(parseInt(chat.id.split('_')[1]));
            if (chatDate >= today) groups.today.push(chat);
            else if (chatDate >= sevenDaysAgo) groups.week.push(chat);
            else groups.older.push(chat);
        });

        const createGroup = (title, chatList) => {
            if (chatList.length > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'chat-history-group';
                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                groupDiv.appendChild(titleEl);
                
                chatList.forEach(chat => {
                    const item = document.createElement('div');
                    item.className = 'chat-history-item';
                    item.dataset.chatId = chat.id;
                    if (chat.id === currentChatId) item.classList.add('active');
                    
                    item.innerHTML = `
                        <i class="far fa-comment-alt"></i>
                        <span>${chat.title}</span>
                        <div class="actions">
                            <button class="rename-btn" title="Rename"><i class="fas fa-pen"></i></button>
                            <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                    
                    item.onclick = () => loadChat(chat.id);
                    item.querySelector('.rename-btn').onclick = (e) => { e.stopPropagation(); showRenameModal(chat.id); };
                    item.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); showDeleteModal(chat.id); };

                    groupDiv.appendChild(item);
                });
                chatHistoryContainer.appendChild(groupDiv);
            }
        };

        createGroup('Today', groups.today);
        createGroup('Previous 7 Days', groups.week);
        createGroup('Older', groups.older);
    }
    
    function loadChat(chatId) {
        window.speechSynthesis.cancel();
        if (chatId === currentChatId && chatContent.children.length > 0 && !chatContent.querySelector('.welcome-screen')) return;
        
        currentChatId = chatId;
        const chat = conversations[chatId];
        
        chatContent.innerHTML = '';
        if (chat.messages.length === 0) {
             showWelcomeScreen();
        } else {
             chat.messages.forEach(msg => {
                 const role = msg.role === 'model' ? 'bot' : 'user';
                 addMessageToChat(role, msg.parts[0].text, false, msg.image ? msg.image.dataUrl : null, msg.id);
             });
        }
        setActiveChat(chatId);
    }
    
    function setActiveChat(chatId) {
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });
    }

    function showRenameModal(chatId) {
        currentModalAction = 'rename';
        currentModalChatId = chatId;
        modal.style.display = 'flex';
        modalTitle.textContent = 'Rename Chat';
        renameView.style.display = 'block';
        confirmationView.style.display = 'none';
        summaryView.style.display = 'none';
        modalToolbarContainer.style.display = 'none';
        modalConfirmBtn.style.display = 'inline-block';
        modalCancelBtn.textContent = 'Cancel';
        renameInput.value = conversations[chatId].title;
        renameInput.focus();
        modalConfirmBtn.textContent = 'Rename';
    }
    
    function showDeleteModal(chatId) {
        currentModalAction = 'delete';
        currentModalChatId = chatId;
        modal.style.display = 'flex';
        modalTitle.textContent = 'Delete Chat';
        renameView.style.display = 'none';
        confirmationView.style.display = 'block';
        summaryView.style.display = 'none';
        modalToolbarContainer.style.display = 'none';
        modalConfirmBtn.style.display = 'inline-block';
        modalConfirmBtn.classList.add('delete');
        modalCancelBtn.textContent = 'Cancel';
        confirmationView.textContent = `Are you sure you want to delete "${conversations[chatId].title}"?`;
        modalConfirmBtn.textContent = 'Delete';
    }

    function showClearHistoryModal(type = 'Clear History') {
        window.speechSynthesis.cancel();
        currentModalAction = 'clear-all';
        modal.style.display = 'flex';
        modalTitle.textContent = type;
        renameView.style.display = 'none';
        confirmationView.style.display = 'block';
        summaryView.style.display = 'none';
        modalToolbarContainer.style.display = 'none';
        modalConfirmBtn.style.display = 'inline-block';
        modalConfirmBtn.classList.add('delete');
        modalCancelBtn.textContent = 'Cancel';
        confirmationView.textContent = 'Are you sure? This will delete all conversations.';
        modalConfirmBtn.textContent = 'Confirm';
        profileMenu.style.display = 'none';
    }
    
    function showSummaryModal(content, title = 'Chat Summary') {
        modal.style.display = 'flex';
        modalTitle.textContent = title;
        renameView.style.display = 'none';
        confirmationView.style.display = 'none';
        summaryView.style.display = 'block';
        modalToolbarContainer.style.display = 'block';
        modalToolbarContainer.innerHTML = '';
        
        summaryView.innerHTML = formatBotMessage(content);
        
        if (title !== 'Loading summary...' && content !== 'Failed to generate summary.') {
            const toolbar = createMessageToolbar(content, 'summary');
            toolbar.style.display = 'flex';
            toolbar.style.justifyContent = 'center';
            modalToolbarContainer.appendChild(toolbar);
        }
        
        modalConfirmBtn.style.display = 'none';
        modalCancelBtn.textContent = 'Close';
    }
    
    function handleModalConfirm() {
        if (currentModalAction === 'clear-all') {
            window.speechSynthesis.cancel();
        }
        if (currentModalAction === 'rename') {
            const newTitle = renameInput.value.trim();
            if (newTitle) conversations[currentModalChatId].title = newTitle;
        } else if (currentModalAction === 'delete') {
            delete conversations[currentModalChatId];
            if (currentChatId === currentModalChatId) {
                const remainingChats = Object.keys(conversations);
                if(remainingChats.length > 0) {
                    loadChat(remainingChats.sort((a,b) => b.split('_')[1] - a.split('_')[1])[0]);
                } else {
                    startNewChat();
                }
            }
        } else if (currentModalAction === 'clear-all') {
            conversations = {};
            localStorage.removeItem('chatbot_conversations');
            startNewChat();
        }
        
        modal.style.display = 'none';
        modalConfirmBtn.classList.remove('delete');
        updateChatHistory();
        saveConversations();
    }

    function saveConversations() {
        localStorage.setItem('chatbot_conversations', JSON.stringify(conversations));
    }

    function loadConversations() {
        const saved = localStorage.getItem('chatbot_conversations');
        if (saved) {
            conversations = JSON.parse(saved);
            const chatIds = Object.keys(conversations);
            if (chatIds.length > 0) {
                const mostRecentChatId = chatIds.sort((a,b) => b.split('_')[1] - a.split('_')[1])[0];
                currentChatId = mostRecentChatId;
                loadChat(mostRecentChatId);
            }
        }
    }

    function cleanTextForSpeech(text) {
        if (!text) return '';
        let cleanedText = text.replace(/```[\s\S]*?```/g, 'Code block.');
        cleanedText = cleanedText.replace(/[\*\_`#]/g, '');
        cleanedText = cleanedText.replace(/^\s*([*+-]|\d+\.)\s+/gm, '');
        return cleanedText;
    }

    function speak(text, onEndCallback, isManual = false) {
        const isEnabled = localStorage.getItem('voiceEnabled') === 'true';
        if (!isManual && !isEnabled) return;
        if (!text || !window.speechSynthesis) return;

        if (!isManual) {
            window.speechSynthesis.cancel();
        }

        const cleanedText = cleanTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = 'en-US';
        
        if (onEndCallback) {
            utterance.onend = onEndCallback;
        }
        
        window.speechSynthesis.speak(utterance);
    }

    // --- Initial Load ---
    applySavedTheme();
    applySavedVoiceSetting();
    loadConversations();
    if (Object.keys(conversations).length === 0) {
        startNewChat();
    } else {
        updateChatHistory();
        setActiveChat(currentChatId);
    }
    
    // Sidebar is closed by default on every load
    document.body.classList.add('sidebar-closed');
    
    // Auto-update year in footer
    document.getElementById('footer-year').textContent = new Date().getFullYear();
});