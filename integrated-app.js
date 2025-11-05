/**
 * Integrated Recipe Link Saver App
 * Combines API functionality from script.js with simple authentication
 */

/**
 * Simple Authentication API - replaces Google OAuth
 */
class SimpleAuthAPI {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        console.log('SimpleAuthAPI constructor: token from localStorage:', this.token ? this.token.substring(0, 30) + '...' : 'null');
        this.credentials = {
            id: 'admin',
            password: 'password123'
        };
    }

    /**
     * Simple login with hardcoded credentials - uses real backend authentication
     */
    async login(id, password) {
        try {
            // Use the real backend authentication endpoint
            const response = await fetch('https://p89aqlqn01.execute-api.ap-northeast-1.amazonaws.com/prod/auth/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: id,
                    adminPassword: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store the real JWT token
                this.token = data.data.token;
                localStorage.setItem('adminToken', this.token);
                console.log('SimpleAuthAPI login: token stored successfully:', this.token.substring(0, 30) + '...');

                return {
                    success: true,
                    user: data.data.user
                };
            } else {
                console.error('SimpleAuthAPI login: authentication failed:', data.error);
                throw new Error(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw new Error('Login failed: ' + error.message);
        }
    }

    /**
     * Logout
     */
    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Verify token with backend
     */
    async verifyToken() {
        if (!this.token) {
            return null;
        }

        try {
            // For now, we'll do a simple check by making an API call
            // In a real implementation, you might have a dedicated verify endpoint
            const response = await fetch('https://p89aqlqn01.execute-api.ap-northeast-1.amazonaws.com/prod/recipes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                // Token is valid, return user info
                return {
                    name: 'Administrator',
                    email: 'admin@example.com',
                    role: 'admin'
                };
            } else {
                // Token is invalid, clear it
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.logout();
            return null;
        }
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        return this.token ? `Bearer ${this.token}` : null;
    }
}

/**
 * RecipeAPI クラス - バックエンドAPIを使用したレシピデータの永続化を行う
 */
class RecipeAPI {
    constructor(authAPI = null) {
        this.baseURL = 'https://p89aqlqn01.execute-api.ap-northeast-1.amazonaws.com/prod/recipes';
        this.timeout = 10000; // 10秒のタイムアウト
        this.authAPI = authAPI;
    }

    /**
     * レシピをバックエンドAPIに保存する
     */
    async saveRecipe(url, title = '', memo = '', rating = '未定') {
        try {
            // 入力値の検証
            if (!url || typeof url !== 'string') {
                throw new Error('有効なURLが必要です');
            }

            // URLの形式検証
            if (!URLValidator.isValidURL(url)) {
                throw new Error('有効なURL形式ではありません');
            }

            // ドメインを抽出
            const domain = URLValidator.extractDomain(url);

            // リクエストボディを準備
            const requestBody = {
                url: url.trim(),
                title: title.trim() || null,
                memo: memo.trim() || null,
                rating: rating || '未定',
                domain: domain
            };

            // APIリクエストを送信
            const response = await this.makeRequest('POST', this.baseURL, requestBody);

            if (response.success && response.data) {
                // APIレスポンスをフロントエンド形式に変換
                return this.transformRecipeFromAPI(response.data);
            } else {
                throw new Error(response.message || 'レシピの保存に失敗しました');
            }

        } catch (error) {
            console.error('レシピの保存に失敗しました:', error);

            // エラーメッセージを適切に処理
            if (error.message.includes('already exists') || error.message.includes('既に保存されています')) {
                throw new Error('このURLは既に保存されています');
            } else if (error.message.includes('有効なURL')) {
                throw new Error('有効なURL形式ではありません');
            } else {
                throw error;
            }
        }
    }

    /**
     * レシピを画像URLと共にバックエンドAPIに保存する
     */
    async saveRecipeWithImage(url, title = '', memo = '', rating = '未定', imageUrl = null) {
        try {
            // 入力値の検証
            if (!url || typeof url !== 'string') {
                throw new Error('有効なURLが必要です');
            }

            // URLの形式検証
            if (!URLValidator.isValidURL(url)) {
                throw new Error('有効なURL形式ではありません');
            }

            // ドメインを抽出
            const domain = URLValidator.extractDomain(url);

            // リクエストボディを準備
            const requestBody = {
                url: url.trim(),
                title: title.trim() || null,
                memo: memo.trim() || null,
                rating: rating || '未定',
                domain: domain,
                image_url: imageUrl
            };

            // APIリクエストを送信
            const response = await this.makeRequest('POST', this.baseURL, requestBody);

            if (response.success && response.data) {
                // APIレスポンスをフロントエンド形式に変換
                return this.transformRecipeFromAPI(response.data);
            } else {
                throw new Error(response.message || 'レシピの保存に失敗しました');
            }

        } catch (error) {
            console.error('レシピの保存に失敗しました:', error);

            // エラーメッセージを適切に処理
            if (error.message.includes('already exists') || error.message.includes('既に保存されています')) {
                throw new Error('このURLは既に保存されています');
            } else if (error.message.includes('有効なURL')) {
                throw new Error('有効なURL形式ではありません');
            } else {
                throw error;
            }
        }
    }

    /**
     * バックエンドAPIからすべてのレシピを取得する（認証不要）
     */
    async getRecipes() {
        try {
            // Public access - don't require authentication for viewing recipes
            const response = await this.makePublicRequest('GET', this.baseURL);

            if (response.success && Array.isArray(response.data)) {
                // APIレスポンスをフロントエンド形式に変換
                return response.data.map(recipe => this.transformRecipeFromAPI(recipe));
            } else {
                console.warn('レシピデータの取得に失敗しました:', response.message);
                return [];
            }

        } catch (error) {
            console.error('レシピの取得に失敗しました:', error);
            return [];
        }
    }

    /**
     * 指定されたIDのレシピをバックエンドAPIから削除する
     */
    async deleteRecipe(id) {
        try {
            if (!id) {
                throw new Error('レシピIDが必要です');
            }

            const response = await this.makeRequest('DELETE', `${this.baseURL}/${id}`);

            if (response.success) {
                return true;
            } else {
                console.warn(`レシピの削除に失敗しました: ${response.message}`);
                return false;
            }

        } catch (error) {
            console.error('レシピの削除に失敗しました:', error);
            return false;
        }
    }

    /**
     * 指定されたIDのレシピを更新する
     */
    async updateRecipe(id, updates) {
        try {
            if (!id) {
                throw new Error('レシピIDが必要です');
            }

            if (!updates || typeof updates !== 'object') {
                throw new Error('更新データが必要です');
            }

            // 更新可能なフィールドのみを処理
            const allowedFields = ['memo', 'rating'];
            const updateData = {};

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    if (key === 'memo') {
                        updateData.memo = String(value).trim();
                    } else if (key === 'rating') {
                        // 数値から文字列に変換
                        const ratingMap = {
                            1: '未定',
                            2: '微妙',
                            3: 'まあまあ',
                            4: '満足',
                            5: '絶対リピ！'
                        };
                        updateData.rating = ratingMap[parseInt(value)] || '未定';
                    }
                }
            }

            const response = await this.makeRequest('PUT', `${this.baseURL}/${id}`, updateData);

            if (response.success && response.data) {
                // APIレスポンスをフロントエンド形式に変換
                return this.transformRecipeFromAPI(response.data);
            } else {
                throw new Error(response.message || 'レシピの更新に失敗しました');
            }

        } catch (error) {
            console.error('レシピの更新に失敗しました:', error);
            return null;
        }
    }

    /**
     * URLからメタデータを抽出する
     */
    async extractMetadata(url) {
        try {
            if (!url || !URLValidator.isValidURL(url)) {
                return null;
            }

            // First, check if this URL already exists in our database
            try {
                const existingRecipes = await this.getRecipes();
                const existingRecipe = existingRecipes.find(recipe => recipe.url === url);

                if (existingRecipe) {
                    // Return the existing recipe's metadata
                    return {
                        title: existingRecipe.title,
                        domain: existingRecipe.domain,
                        description: existingRecipe.memo ? `メモ: ${existingRecipe.memo}` : `既存のレシピ (評価: ${this.getRatingLabel(existingRecipe.rating)})`,
                        image: existingRecipe.imageUrl,
                        isExisting: true
                    };
                }
            } catch (dbError) {
                console.warn('既存レシピの確認に失敗しました:', dbError);
                // Continue with fallback metadata extraction
            }

            // Try to extract real metadata using a CORS proxy
            try {
                const metadata = await this.fetchRealMetadata(url);
                if (metadata) {
                    return metadata;
                }
            } catch (metaError) {
                console.warn('リアルメタデータの取得に失敗しました:', metaError);
                // Fall back to basic extraction
            }

            // Fallback: Extract basic information from the URL
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Generate a basic title from the URL
            let title = '';
            let description = '';

            // Extract title from common recipe site patterns
            if (domain.includes('cookpad.com')) {
                title = 'Cookpad レシピ';
                description = 'Cookpadからのレシピです。保存後に正確なタイトルが表示されます。';
            } else if (domain.includes('kurashiru.com')) {
                title = 'クラシル レシピ';
                description = 'クラシルからのレシピです。保存後に正確なタイトルが表示されます。';
            } else if (domain.includes('delishkitchen.tv')) {
                title = 'DELISH KITCHEN レシピ';
                description = 'DELISH KITCHENからのレシピです。保存後に正確なタイトルが表示されます。';
            } else if (domain.includes('recipe.rakuten.co.jp')) {
                title = '楽天レシピ';
                description = '楽天レシピからのレシピです。保存後に正確なタイトルが表示されます。';
            } else if (domain.includes('kyounoryouri.jp')) {
                title = 'きょうの料理 レシピ';
                description = 'きょうの料理からのレシピです。保存後に正確なタイトルが表示されます。';
            } else {
                // Generate title from domain
                title = domain.replace('www.', '') + ' のレシピ';
                description = `${domain} からのレシピです。保存後に正確なタイトルが表示されます。`;
            }

            return {
                title: title,
                domain: domain,
                description: description,
                image: null,
                isExisting: false
            };

        } catch (error) {
            console.warn('メタデータの抽出をスキップします:', error.message);
            return null;
        }
    }

    /**
     * 評価の数値をラベルに変換する
     */
    getRatingLabel(rating) {
        const ratingLabels = {
            1: '未定',
            2: '微妙',
            3: 'まあまあ',
            4: '満足',
            5: '絶対リピ！'
        };
        return ratingLabels[rating] || '未定';
    }

    /**
     * 実際のメタデータを取得する（CORS プロキシ使用）
     */
    async fetchRealMetadata(url) {
        try {
            // Use a public CORS proxy to fetch the page content
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch(proxyUrl, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const htmlContent = data.contents;

            if (!htmlContent) {
                throw new Error('No content received');
            }

            // Parse the HTML to extract metadata
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Extract title
            let title = '';

            // Try Open Graph title first
            const ogTitle = doc.querySelector('meta[property="og:title"]');
            if (ogTitle) {
                title = ogTitle.getAttribute('content');
            }

            // Fall back to regular title tag
            if (!title) {
                const titleTag = doc.querySelector('title');
                if (titleTag) {
                    title = titleTag.textContent;
                }
            }

            // Extract image
            let image = null;
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage) {
                image = ogImage.getAttribute('content');
                // Make sure image URL is absolute
                if (image && !image.startsWith('http')) {
                    const urlObj = new URL(url);
                    if (image.startsWith('/')) {
                        image = `${urlObj.protocol}//${urlObj.host}${image}`;
                    } else {
                        image = `${urlObj.protocol}//${urlObj.host}/${image}`;
                    }
                }
            }

            // Extract description
            let description = '';
            const ogDescription = doc.querySelector('meta[property="og:description"]');
            if (ogDescription) {
                description = ogDescription.getAttribute('content');
            }

            if (!description) {
                const metaDescription = doc.querySelector('meta[name="description"]');
                if (metaDescription) {
                    description = metaDescription.getAttribute('content');
                }
            }

            const urlObj = new URL(url);

            return {
                title: title || `${urlObj.hostname} のレシピ`,
                domain: urlObj.hostname,
                description: description || `${urlObj.hostname} からのレシピ`,
                image: image,
                isExisting: false
            };

        } catch (error) {
            console.warn('CORS プロキシでのメタデータ取得に失敗:', error);
            throw error;
        }
    }

    /**
     * HTTP リクエストを送信する共通メソッド
     */
    async makeRequest(method, url, body = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            };

            // Add authorization header if authenticated
            if (this.authAPI && this.authAPI.isAuthenticated()) {
                const authHeader = this.authAPI.getAuthHeader();
                console.log('makeRequest: Adding auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'null');
                if (authHeader) {
                    options.headers['Authorization'] = authHeader;
                } else {
                    console.error('makeRequest: Auth header is null despite being authenticated');
                }
            } else {
                console.error('makeRequest: Not authenticated or authAPI missing', {
                    authAPI: !!this.authAPI,
                    isAuthenticated: this.authAPI ? this.authAPI.isAuthenticated() : false
                });
            }

            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            // レスポンスの内容を取得
            const responseData = await response.json();

            if (!response.ok) {
                // HTTPエラーステータスの場合
                throw new Error(responseData.message || `HTTP Error: ${response.status}`);
            }

            return responseData;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
            } else {
                throw error;
            }
        }
    }

    /**
     * 認証不要のHTTPリクエストを送信する共通メソッド
     */
    async makePublicRequest(method, url, body = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            };

            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            // レスポンスの内容を取得
            const responseData = await response.json();

            if (!response.ok) {
                // HTTPエラーステータスの場合
                throw new Error(responseData.message || `HTTP Error: ${response.status}`);
            }

            return responseData;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
            } else {
                throw error;
            }
        }
    }

    /**
     * APIレスポンスをフロントエンド形式に変換する
     */
    transformRecipeFromAPI(apiRecipe) {
        // 評価を数値に変換
        const ratingMap = {
            '未定': 1,
            '微妙': 2,
            'まあまあ': 3,
            '満足': 4,
            '絶対リピ！': 5
        };

        return {
            id: apiRecipe.id,
            url: apiRecipe.url,
            title: apiRecipe.title || apiRecipe.domain || 'レシピ',
            domain: apiRecipe.domain,
            dateAdded: apiRecipe.date_added || apiRecipe.created_at,
            memo: apiRecipe.memo || '',
            rating: ratingMap[apiRecipe.rating] || 1,
            imageUrl: apiRecipe.image_url || null
        };
    }

    /**
     * API接続の可用性をチェックする（認証不要）
     */
    async isAPIAvailable() {
        try {
            const response = await this.makePublicRequest('GET', this.baseURL);
            return response.success === true;
        } catch (error) {
            console.warn('APIが使用できません:', error);
            return false;
        }
    }
}

/**
 * URLValidator クラス - URL形式の検証とドメイン抽出を行う
 */
class URLValidator {
    /**
     * URLが有効かどうかを検証する
     */
    static isValidURL(urlString) {
        if (!urlString || typeof urlString !== 'string') {
            return false;
        }

        urlString = urlString.trim();
        if (urlString === '') {
            return false;
        }

        try {
            const url = new URL(urlString);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    /**
     * URLからドメイン名を抽出する
     */
    static extractDomain(urlString) {
        if (!this.isValidURL(urlString)) {
            return null;
        }

        try {
            const url = new URL(urlString.trim());
            return url.hostname;
        } catch (error) {
            return null;
        }
    }
}

/**
 * RecipeUI クラス - レシピの表示とユーザーインターフェースを管理する
 */
class RecipeUI {
    constructor(storage) {
        this.storage = storage;
        this.container = document.getElementById('recipes-container');
        this.messageElement = document.getElementById('message');
        this.searchInput = document.getElementById('recipe-search');
        this.sortSelect = document.getElementById('recipe-sort');
        this.clearSearchBtn = document.getElementById('clear-search');
        this.emptyState = document.getElementById('empty-state');
        this.noResults = document.getElementById('no-results');

        // 評価のラベル定義
        this.ratingLabels = {
            1: '未定',
            2: '微妙',
            3: 'まあまあ',
            4: '満足',
            5: '絶対リピ！'
        };

        // 現在の検索・ソート状態
        this.currentSearchTerm = '';
        this.currentSortOption = 'date-desc';
        this.allRecipes = [];
        this.filteredRecipes = [];
    }

    /**
     * すべてのレシピを表示する
     */
    async renderRecipes() {
        try {
            // レシピを取得
            this.allRecipes = await this.storage.getRecipes();

            // 検索とソートを適用
            this.applyFiltersAndSort();

        } catch (error) {
            console.error('レシピの表示に失敗しました:', error);
            this.showMessage('レシピの表示中にエラーが発生しました', 'error');
        }
    }

    /**
     * 検索とソートを適用してレシピを表示する
     */
    applyFiltersAndSort() {
        // 検索フィルターを適用
        this.filteredRecipes = this.filterRecipes(this.allRecipes, this.currentSearchTerm);

        // ソートを適用
        this.filteredRecipes = this.sortRecipes(this.filteredRecipes, this.currentSortOption);

        // 表示を更新
        this.updateDisplay();
    }

    /**
     * レシピを検索条件でフィルタリングする
     */
    filterRecipes(recipes, searchTerm) {
        if (!searchTerm.trim()) {
            return recipes;
        }

        const term = searchTerm.toLowerCase().trim();

        return recipes.filter(recipe => {
            return (
                recipe.title.toLowerCase().includes(term) ||
                recipe.domain.toLowerCase().includes(term) ||
                recipe.memo.toLowerCase().includes(term) ||
                recipe.url.toLowerCase().includes(term) ||
                this.ratingLabels[recipe.rating].toLowerCase().includes(term)
            );
        });
    }

    /**
     * レシピをソートする
     */
    sortRecipes(recipes, sortOption) {
        const sorted = [...recipes];

        switch (sortOption) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
            case 'title-asc':
                return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
            case 'title-desc':
                return sorted.sort((a, b) => b.title.localeCompare(a.title, 'ja'));
            case 'rating-desc':
                return sorted.sort((a, b) => b.rating - a.rating);
            case 'rating-asc':
                return sorted.sort((a, b) => a.rating - b.rating);
            case 'domain-asc':
                return sorted.sort((a, b) => a.domain.localeCompare(b.domain));
            default:
                return sorted;
        }
    }

    /**
     * 表示を更新する
     */
    updateDisplay() {
        // コンテナをクリア
        this.container.innerHTML = '';

        // 状態を更新
        this.updateEmptyStates();

        // レシピがない場合は早期リターン
        if (this.allRecipes.length === 0) {
            return;
        }

        // 検索結果がない場合は早期リターン
        if (this.filteredRecipes.length === 0 && this.currentSearchTerm.trim()) {
            return;
        }

        // 各レシピのカードを生成して表示
        this.filteredRecipes.forEach(recipe => {
            const recipeCard = this.createRecipeCard(recipe);
            this.container.appendChild(recipeCard);
        });
    }

    /**
     * 空の状態表示を更新する
     */
    updateEmptyStates() {
        if (this.allRecipes.length === 0) {
            this.emptyState.style.display = 'block';
            this.noResults.style.display = 'none';
        } else if (this.filteredRecipes.length === 0 && this.currentSearchTerm.trim()) {
            this.emptyState.style.display = 'none';
            this.noResults.style.display = 'block';
        } else {
            this.emptyState.style.display = 'none';
            this.noResults.style.display = 'none';
        }
    }

    /**
     * レシピカードのHTML要素を生成する
     */
    createRecipeCard(recipe) {
        // カードのコンテナを作成
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.setAttribute('data-recipe-id', recipe.id);

        // 日付をフォーマット（相対時間も表示）
        const dateAdded = new Date(recipe.dateAdded);
        const formattedDate = this.formatDate(dateAdded);
        const relativeTime = this.getRelativeTime(dateAdded);

        // 星評価のHTML要素を生成（コンパクト版）
        const starRatingHTML = this.createCompactStarRating(recipe.rating);

        // 画像表示部分を生成
        const imageHTML = this.createRecipeImageHTML(recipe);

        // Check if user is authenticated to show admin buttons
        const isAuthenticated = window.recipeLinkSaver && window.recipeLinkSaver.authManager && window.recipeLinkSaver.authManager.isAuthenticated();

        // Admin buttons (only show if authenticated)
        const adminButtonsHTML = isAuthenticated ? `
            <button class="delete-btn" data-recipe-id="${recipe.id}" title="削除" aria-label="レシピを削除">
                <span class="delete-icon">×</span>
            </button>
        ` : '';

        const editButtonHTML = isAuthenticated ? `
            <button class="edit-btn" data-recipe-id="${recipe.id}" aria-label="レシピを編集">
                <span class="edit-icon">✏️</span>
            </button>
        ` : '';

        // カードのHTML構造を設定（ユーザーフレンドリーなレイアウト）
        card.innerHTML = `
            <div class="recipe-card-main">
                <div class="recipe-header">
                    <div class="recipe-title-section">
                        <h3 class="recipe-title">
                            <a href="${recipe.url}" target="_blank" rel="noopener noreferrer" class="recipe-link" title="レシピを開く">
                                ${this.escapeHtml(recipe.title)}
                            </a>
                        </h3>
                        <div class="recipe-domain-container">
                            <div class="recipe-meta">
                                <span class="recipe-date" title="${formattedDate}">
                                <span class="date-icon">📅</span>
                                ${relativeTime}
                                </span>
                                <div class="recipe-rating">
                                    ${starRatingHTML}
                                </div>
                                <span class="recipe-domain">${this.escapeHtml(recipe.domain)}</span>
                            </div>
                             ${recipe.memo ? `
                            <div class="recipe-memo">
                                <span class="memo-icon">💭</span>
                                <p class="memo-text">${this.escapeHtml(recipe.memo)}</p>
                            </div>
                        ` : ''}
                        </div>
                    </div>
                    ${imageHTML}

                <div>
                                                                                           ${adminButtonsHTML}
                    ${editButtonHTML}
                </div>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * レシピ画像のHTML要素を生成する
     */
    createRecipeImageHTML(recipe) {
        if (!recipe.imageUrl) {
            return '<div class="recipe-image-placeholder"><span class="image-placeholder-icon">🍽️</span></div>';
        }

        return `
            <div class="recipe-image-container">
                <img 
                    src="${this.escapeHtml(recipe.imageUrl)}" 
                    alt="${this.escapeHtml(recipe.title)}"
                    class="recipe-image"
                    loading="lazy"
                    onerror="this.parentElement.innerHTML='<div class=\\'recipe-image-error\\'>画像を読み込めませんでした</div>'"
                />
            </div>
        `;
    }

    /**
     * 日付をフォーマットする
     */
    formatDate(date) {
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    }

    /**
     * 相対時間を取得する
     */
    getRelativeTime(date) {
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffMinutes < 1) {
            return 'たった今';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}分前`;
        } else if (diffHours < 24) {
            return `${diffHours}時間前`;
        } else if (diffDays === 1) {
            return '昨日';
        } else if (diffDays < 7) {
            return `${diffDays}日前`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}週間前`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months}ヶ月前`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years}年前`;
        }
    }

    /**
     * コンパクトな星評価を生成する
     */
    createCompactStarRating(rating) {
        const ratingLabel = this.ratingLabels[rating] || '未定';
        let stars = '';

        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<span class="star filled">★</span>';
            } else {
                stars += '<span class="star empty">☆</span>';
            }
        }

        return `
            <div class="star-rating compact">
                <div class="stars">${stars}</div>
                <span class="rating-label">${ratingLabel}</span>
            </div>
        `;
    }

    /**
     * メッセージを表示する
     */
    showMessage(text, type = 'info', duration = 3000) {
        if (!this.messageElement) {
            console.warn('メッセージ要素が見つかりません');
            return;
        }

        // メッセージ要素をクリア
        this.messageElement.innerHTML = '';
        this.messageElement.className = 'message';

        // メッセージタイプに応じたクラスを追加
        if (type) {
            this.messageElement.classList.add(`message-${type}`);
        }

        // メッセージテキストを設定
        this.messageElement.textContent = text;

        // メッセージを表示
        this.messageElement.style.display = 'block';

        // 指定時間後にメッセージを非表示にする
        if (duration > 0) {
            setTimeout(() => {
                this.hideMessage();
            }, duration);
        }
    }

    /**
     * メッセージを非表示にする
     */
    hideMessage() {
        if (this.messageElement) {
            this.messageElement.style.display = 'none';
            this.messageElement.innerHTML = '';
            this.messageElement.className = 'message';
        }
    }

    /**
     * HTMLエスケープ処理
     */
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * レシピカードの削除ボタンイベントをバインドする
     */
    bindDeleteEvents() {
        // イベント委譲を使用して削除ボタンのクリックイベントを処理
        this.container.addEventListener('click', (event) => {
            if (event.target.closest('.delete-btn')) {
                const deleteBtn = event.target.closest('.delete-btn');
                const recipeId = deleteBtn.getAttribute('data-recipe-id');
                this.handleDelete(recipeId);
            }
        });
    }

    /**
     * レシピカードの編集ボタンイベントをバインドする
     */
    bindEditEvents() {
        // イベント委譲を使用して編集ボタンのクリックイベントを処理
        this.container.addEventListener('click', (event) => {
            if (event.target.closest('.edit-btn')) {
                const editBtn = event.target.closest('.edit-btn');
                const recipeId = editBtn.getAttribute('data-recipe-id');
                this.handleEdit(recipeId);
            }
        });
    }

    /**
     * レシピの削除処理
     */
    async handleDelete(recipeId) {
        if (!recipeId) {
            this.showMessage('削除するレシピが見つかりません', 'error');
            return;
        }

        // 確認ダイアログを表示
        if (confirm('このレシピを削除しますか？')) {
            try {
                // 削除中メッセージを表示
                this.showMessage('レシピを削除中...', 'info', 0);

                const success = await this.storage.deleteRecipe(recipeId);

                if (success) {
                    this.showMessage('レシピを削除しました', 'success');
                    // 表示を更新
                    await this.renderRecipes();
                } else {
                    this.showMessage('レシピの削除に失敗しました', 'error');
                }
            } catch (error) {
                console.error('レシピの削除に失敗しました:', error);
                this.showMessage('レシピの削除中にエラーが発生しました', 'error');
            }
        }
    }

    /**
     * レシピの編集処理
     */
    async handleEdit(recipeId) {
        if (!recipeId) {
            this.showMessage('編集するレシピが見つかりません', 'error');
            return;
        }

        try {
            // レシピを取得
            const recipes = await this.storage.getRecipes();
            const recipe = recipes.find(r => r.id === recipeId);

            if (!recipe) {
                this.showMessage('レシピが見つかりません', 'error');
                return;
            }

            // 編集フォームを表示（簡単な実装）
            const newMemo = prompt('メモを編集してください:', recipe.memo || '');
            if (newMemo === null) {
                return; // キャンセルされた場合
            }

            const newRating = prompt('評価を入力してください (1:未定, 2:微妙, 3:まあまあ, 4:満足, 5:絶対リピ！):', recipe.rating);
            if (newRating === null) {
                return; // キャンセルされた場合
            }

            const ratingValue = parseInt(newRating);
            if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
                this.showMessage('評価は1から5の数値で入力してください', 'error');
                return;
            }

            // 更新中メッセージを表示
            this.showMessage('レシピを更新中...', 'info', 0);

            // レシピを更新
            const updatedRecipe = await this.storage.updateRecipe(recipeId, {
                memo: newMemo,
                rating: ratingValue
            });

            if (updatedRecipe) {
                this.showMessage('レシピを更新しました', 'success');
                // 表示を更新
                await this.renderRecipes();
            } else {
                this.showMessage('レシピの更新に失敗しました', 'error');
            }
        } catch (error) {
            console.error('レシピの編集に失敗しました:', error);
            this.showMessage('レシピの編集中にエラーが発生しました', 'error');
        }
    }

    /**
     * すべてのイベントリスナーをバインドする
     */
    bindEvents() {
        this.bindDeleteEvents();
        this.bindEditEvents();
        this.bindSearchEvents();
        this.bindSortEvents();
    }

    /**
     * 検索機能のイベントをバインドする
     */
    bindSearchEvents() {
        if (!this.searchInput || !this.clearSearchBtn) {
            return;
        }

        // 検索入力イベント（リアルタイム検索）
        this.searchInput.addEventListener('input', (event) => {
            this.currentSearchTerm = event.target.value;
            this.applyFiltersAndSort();

            // クリアボタンの表示/非表示
            if (this.currentSearchTerm.trim()) {
                this.clearSearchBtn.classList.add('show');
            } else {
                this.clearSearchBtn.classList.remove('show');
            }
        });

        // 検索クリアボタン
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.currentSearchTerm = '';
            this.clearSearchBtn.classList.remove('show');
            this.applyFiltersAndSort();
            this.searchInput.focus();
        });

        // Enterキーでの検索
        this.searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.currentSearchTerm = event.target.value;
                this.applyFiltersAndSort();
            }
        });
    }

    /**
     * ソート機能のイベントをバインドする
     */
    bindSortEvents() {
        if (!this.sortSelect) {
            return;
        }

        this.sortSelect.addEventListener('change', (event) => {
            this.currentSortOption = event.target.value;
            this.applyFiltersAndSort();
        });
    }
}

/**
 * Simple AuthManager クラス - 簡単な認証とUI状態を管理する
 */
class SimpleAuthManager {
    constructor() {
        this.authAPI = new SimpleAuthAPI();
        this.currentUser = null;
        this.isInitialized = false;

        // UI要素
        this.loginSection = document.getElementById('login-section');
        this.userSection = document.getElementById('user-section');
        this.loginForm = document.getElementById('login-form');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userName = document.getElementById('user-name');
    }

    /**
     * 認証を初期化する
     */
    async init() {
        console.log('SimpleAuthManager: 初期化開始');

        // まず既存のトークンを確認
        const user = await this.authAPI.verifyToken();
        if (user) {
            console.log('SimpleAuthManager: 既存のトークンが有効です', user);
            this.currentUser = user;
            this.showUserSection();
        } else {
            console.log('SimpleAuthManager: 既存のトークンがありません、ログインセクションを表示');
            this.showLoginSection();
        }

        // イベントリスナーを設定
        this.bindEvents();

        this.isInitialized = true;
        console.log('SimpleAuthManager: 初期化完了');
    }

    /**
     * イベントリスナーをバインドする
     */
    bindEvents() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * ログインを処理する
     */
    async handleLogin() {
        console.log('SimpleAuthManager: ログイン開始');

        const idInput = document.getElementById('admin-id');
        const passwordInput = document.getElementById('admin-password');

        if (!idInput || !passwordInput) {
            console.error('ログイン入力要素が見つかりません');
            return;
        }

        const id = idInput.value.trim();
        const password = passwordInput.value.trim();
        console.log(id, password);

        try {
            const result = await this.authAPI.login(id, password);

            if (result.success) {
                this.currentUser = result.user;
                this.showUserSection();

                // フォームをクリア
                idInput.value = '';
                passwordInput.value = '';

                // アプリケーションに認証状態変更を通知
                if (window.recipeLinkSaver) {
                    await window.recipeLinkSaver.onAuthStateChanged(true);
                }
            }
        } catch (error) {
            console.error('ログインに失敗しました:', error);
            alert('ログインに失敗しました: ' + error.message);
            passwordInput.value = '';
        }
    }

    /**
     * ログアウトを処理する
     */
    async handleLogout() {
        try {
            this.authAPI.logout();
            this.currentUser = null;
            this.showLoginSection();

            // アプリケーションに認証状態変更を通知
            if (window.recipeLinkSaver) {
                await window.recipeLinkSaver.onAuthStateChanged(false);
            }

        } catch (error) {
            console.error('ログアウトに失敗しました:', error);
        }
    }

    /**
     * ログインセクションを表示する
     */
    showLoginSection() {
        console.log('SimpleAuthManager: ログインセクションを表示');
        if (this.loginSection) {
            this.loginSection.style.display = 'block';
        }
        if (this.userSection) {
            this.userSection.style.display = 'none';
        }
    }

    /**
     * ユーザーセクションを表示する
     */
    showUserSection() {
        if (this.loginSection) {
            this.loginSection.style.display = 'none';
        }
        if (this.userSection) {
            this.userSection.style.display = 'flex';
        }

        if (this.currentUser && this.userName) {
            this.userName.textContent = this.currentUser.name || 'Admin';
        }
    }

    /**
     * 認証状態を確認する
     */
    isAuthenticated() {
        return !!this.currentUser && this.authAPI.isAuthenticated();
    }

    /**
     * 現在のユーザーを取得する
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

/**
 * RecipeLinkSaver アプリケーションのメインクラス
 */
class RecipeLinkSaver {
    constructor() {
        this.authManager = new SimpleAuthManager();
        this.authAPI = this.authManager.authAPI;
        this.api = new RecipeAPI(this.authAPI);
        this.ui = new RecipeUI(this.api);
        this.form = document.getElementById('recipe-form');

        this.init();
    }

    /**
     * アプリケーションを初期化する
     */
    async init() {
        try {
            console.log('RecipeLinkSaver: 初期化開始');

            // 認証を初期化
            await this.authManager.init();

            // 認証状態に応じてUIを初期化
            const isAuthenticated = this.authManager.isAuthenticated();
            console.log('RecipeLinkSaver: 認証状態:', isAuthenticated);
            await this.onAuthStateChanged(isAuthenticated);

        } catch (error) {
            console.error('アプリケーションの初期化に失敗しました:', error);
            this.ui.showMessage('アプリケーションの初期化に失敗しました。ページを再読み込みしてください。', 'error', 0);
        }
    }

    /**
     * 認証状態が変更された時の処理
     */
    async onAuthStateChanged(isAuthenticated) {
        try {
            // Always load and display recipes for public viewing
            await this.loadAndDisplayRecipes();

            if (isAuthenticated) {
                // 認証済みの場合 - Show admin functionality
                this.showMainContent();

                // イベントリスナーをバインド
                this.bindFormEvents();
                this.ui.showMessage('ログインしました', 'success');

            } else {
                // 未認証の場合 - Hide admin functionality but keep recipes visible
                this.hideMainContent();
                // Clear any previous admin-related messages
                this.ui.hideMessage();
            }

            // Always bind UI events for public viewing (search, sort, etc.)
            this.ui.bindEvents();

            // Always bind URL preview events (works without authentication)
            this.bindUrlPreviewEvents();

        } catch (error) {
            console.error('認証状態変更の処理に失敗しました:', error);
            this.ui.showMessage('エラーが発生しました。ページを再読み込みしてください。', 'error', 0);
        }
    }

    /**
     * レシピを読み込んで表示する（認証不要）
     */
    async loadAndDisplayRecipes() {
        try {
            // API接続の可用性をチェック
            const isAPIAvailable = await this.api.isAPIAvailable();
            if (!isAPIAvailable) {
                this.ui.showMessage('サーバーに接続できません。しばらく待ってから再度お試しください。', 'error', 0);
                return;
            }

            // 既存のレシピを表示（認証不要）
            await this.ui.renderRecipes();

        } catch (error) {
            console.error('レシピの読み込みに失敗しました:', error);
            this.ui.showMessage('レシピの読み込み中にエラーが発生しました。', 'error');
        }
    }

    /**
     * メインコンテンツを表示する
     */
    showMainContent() {
        console.log('showMainContent: メインコンテンツを表示します');
        const adminPanel = document.getElementById('admin-panel');
        const recipeListSection = document.querySelector('.recipe-list');

        if (adminPanel) {
            adminPanel.style.display = 'block';
            console.log('showMainContent: 管理パネルを表示しました');
        } else {
            console.error('showMainContent: 管理パネルが見つかりません');
        }

        if (recipeListSection) {
            recipeListSection.style.display = 'block';
            console.log('showMainContent: レシピリストセクションを表示しました');
        } else {
            console.error('showMainContent: レシピリストセクションが見つかりません');
        }
    }

    /**
     * メインコンテンツを非表示にする
     */
    hideMainContent() {
        const adminPanel = document.getElementById('admin-panel');
        const recipeListSection = document.querySelector('.recipe-list');

        if (adminPanel) adminPanel.style.display = 'none';
        if (recipeListSection) recipeListSection.style.display = 'block'; // レシピリストは常に表示
    }

    /**
     * フォーム送信イベントをバインドする
     */
    bindFormEvents() {
        // Re-find the form element in case it wasn't available during construction
        this.form = document.getElementById('recipe-form');

        if (!this.form) {
            console.error('レシピフォームが見つかりません');
            return;
        }

        console.log('フォームイベントをバインドしています...');
        this.form.addEventListener('submit', (event) => {
            console.log('フォーム送信イベントが発生しました');
            event.preventDefault();
            this.handleFormSubmit();
        });
    }

    /**
     * URL プレビュー機能のイベントをバインドする
     */
    bindUrlPreviewEvents() {
        const urlInput = document.getElementById('recipe-url');
        const titleInput = document.getElementById('recipe-title');

        if (!urlInput) return;

        let previewTimeout;

        // URL入力時のプレビュー機能
        urlInput.addEventListener('input', (event) => {
            const url = event.target.value.trim();

            // Clear previous timeout
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }

            // Remove existing preview
            this.removeUrlPreview();

            if (url && URLValidator.isValidURL(url)) {
                // Show loading state
                this.showUrlPreviewLoading();

                // Debounce the preview request
                previewTimeout = setTimeout(async () => {
                    await this.showUrlPreview(url);
                }, 1000); // Wait 1 second after user stops typing
            }
        });

        // Clear preview when URL is cleared
        urlInput.addEventListener('blur', () => {
            if (!urlInput.value.trim()) {
                this.removeUrlPreview();
            }
        });
    }

    /**
     * URL プレビューを表示する
     */
    async showUrlPreview(url) {
        try {
            const metadata = await this.api.extractMetadata(url);

            if (metadata) {
                this.displayUrlPreview(metadata, url);

                // Auto-fill title if empty
                const titleInput = document.getElementById('recipe-title');
                if (titleInput && !titleInput.value.trim() && metadata.title) {
                    titleInput.value = metadata.title;
                    titleInput.style.backgroundColor = '#e8f5e8'; // Light green to indicate auto-fill
                    setTimeout(() => {
                        titleInput.style.backgroundColor = '';
                    }, 2000);
                }
            } else {
                this.removeUrlPreview();
            }
        } catch (error) {
            console.warn('URL プレビューの取得に失敗しました:', error);
            this.removeUrlPreview();
        }
    }

    /**
     * URL プレビューのローディング状態を表示する
     */
    showUrlPreviewLoading() {
        const urlInput = document.getElementById('recipe-url');
        if (!urlInput) return;

        const previewContainer = document.createElement('div');
        previewContainer.id = 'url-preview-container';
        previewContainer.className = 'url-preview-container loading';
        previewContainer.innerHTML = `
            <div class="url-preview-loading">
                <div class="loading-spinner"></div>
                <span>プレビューを取得中...</span>
            </div>
        `;

        // Insert after the URL input
        urlInput.parentNode.insertBefore(previewContainer, urlInput.nextSibling);
    }

    /**
     * URL プレビューを表示する
     */
    displayUrlPreview(metadata, url) {
        this.removeUrlPreview();

        const urlInput = document.getElementById('recipe-url');
        if (!urlInput) return;

        const previewContainer = document.createElement('div');
        previewContainer.id = 'url-preview-container';
        previewContainer.className = 'url-preview-container';

        const imageHtml = metadata.image
            ? `<img src="${this.ui.escapeHtml(metadata.image)}" alt="Preview" class="url-preview-image" onerror="this.style.display='none'">`
            : '<div class="url-preview-no-image">🍽️</div>';

        // Add special styling for existing recipes
        const existingClass = metadata.isExisting ? ' existing-recipe' : '';
        const existingBadge = metadata.isExisting ? '<span class="existing-badge">既存のレシピ</span>' : '';

        previewContainer.innerHTML = `
            <div class="url-preview${existingClass}">
                <div class="url-preview-image-container">
                    ${imageHtml}
                </div>
                <div class="url-preview-content">
                    <div class="url-preview-header">
                        <h4 class="url-preview-title">${this.ui.escapeHtml(metadata.title || 'タイトルなし')}</h4>
                        ${existingBadge}
                    </div>
                    <p class="url-preview-domain">${this.ui.escapeHtml(metadata.domain)}</p>
                    ${metadata.description ? `<p class="url-preview-description">${this.ui.escapeHtml(metadata.description.length > 100 ? metadata.description.substring(0, 100) + '...' : metadata.description)}</p>` : ''}
                </div>
                <button type="button" class="url-preview-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Insert after the URL input
        urlInput.parentNode.insertBefore(previewContainer, urlInput.nextSibling);
    }

    /**
     * URL プレビューエラーを表示する
     */
    showUrlPreviewError(message) {
        this.removeUrlPreview();

        const urlInput = document.getElementById('recipe-url');
        if (!urlInput) return;

        const previewContainer = document.createElement('div');
        previewContainer.id = 'url-preview-container';
        previewContainer.className = 'url-preview-container error';
        previewContainer.innerHTML = `
            <div class="url-preview-error">
                <span class="error-icon">⚠️</span>
                <span>${message}</span>
                <button type="button" class="url-preview-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Insert after the URL input
        urlInput.parentNode.insertBefore(previewContainer, urlInput.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeUrlPreview();
        }, 5000);
    }

    /**
     * URL プレビューを削除する
     */
    removeUrlPreview() {
        const existingPreview = document.getElementById('url-preview-container');
        if (existingPreview) {
            existingPreview.remove();
        }
    }

    /**
     * フォーム送信を処理する
     */
    async handleFormSubmit() {
        try {
            console.log('handleFormSubmit: フォーム送信処理を開始します');

            // Check authentication first
            console.log('handleFormSubmit: 認証状態をチェック中...', {
                authManager: !!this.authManager,
                isAuthenticated: this.authManager ? this.authManager.isAuthenticated() : false,
                authAPI: !!this.authAPI,
                token: this.authAPI ? (this.authAPI.token ? this.authAPI.token.substring(0, 30) + '...' : 'null') : 'no authAPI'
            });

            if (!this.authManager.isAuthenticated()) {
                console.error('handleFormSubmit: ユーザーが認証されていません');
                this.ui.showMessage('ログインが必要です', 'error');
                return;
            }
            console.log('handleFormSubmit: 認証確認完了');

            // フォームデータを取得
            const formData = this.getFormData();
            console.log('handleFormSubmit: フォームデータ取得完了', formData);

            // URL検証
            if (!this.validateFormData(formData)) {
                return;
            }

            // 送信中メッセージを表示
            this.ui.showMessage('レシピを保存中...', 'info', 0);

            // 評価を文字列に変換
            const ratingMap = {
                1: '未定',
                2: '微妙',
                3: 'まあまあ',
                4: '満足',
                5: '絶対リピ！'
            };

            // メタデータ（画像URL含む）を抽出
            let extractedTitle = formData.title;
            let imageUrl = null;

            try {
                // Try to extract metadata silently (don't show loading message)
                const metadata = await this.api.extractMetadata(formData.url);

                if (metadata) {
                    // タイトルが入力されていない場合は抽出されたタイトルを使用
                    if (!extractedTitle && metadata.title) {
                        extractedTitle = metadata.title;
                    }

                    // 画像URLを取得
                    if (metadata.image) {
                        imageUrl = metadata.image;
                    }
                }
            } catch (metaError) {
                console.warn('メタデータの抽出に失敗しました:', metaError);
                // メタデータ抽出に失敗してもレシピ保存は続行
            }

            // レシピを保存
            const savedRecipe = await this.api.saveRecipeWithImage(
                formData.url,
                extractedTitle,
                formData.memo,
                ratingMap[formData.rating] || '未定',
                imageUrl
            );

            if (savedRecipe) {
                // 成功メッセージを表示
                this.ui.showMessage('レシピを保存しました！', 'success');

                // フォームをリセット
                this.resetForm();

                // レシピ一覧を更新
                await this.ui.renderRecipes();
            } else {
                // エラーメッセージを表示
                this.ui.showMessage('レシピの保存に失敗しました。もう一度お試しください。', 'error');
            }

        } catch (error) {
            console.error('フォーム送信エラー:', error);

            // エラーの種類に応じてメッセージを表示
            if (error.message.includes('既に保存されています')) {
                this.ui.showMessage('このURLは既に保存されています。', 'error');
            } else if (error.message.includes('有効なURL')) {
                this.ui.showMessage('有効なURLを入力してください。', 'error');
            } else if (error.message.includes('ネットワークエラー')) {
                this.ui.showMessage('ネットワークエラーが発生しました。インターネット接続を確認してください。', 'error');
            } else if (error.message.includes('タイムアウト')) {
                this.ui.showMessage('リクエストがタイムアウトしました。もう一度お試しください。', 'error');
            } else {
                this.ui.showMessage('エラーが発生しました。もう一度お試しください。', 'error');
            }
        }
    }

    /**
     * フォームからデータを取得する
     */
    getFormData() {
        console.log('getFormData: フォームデータ取得開始');

        const urlInput = document.getElementById('recipe-url');
        const titleInput = document.getElementById('recipe-title');
        const memoInput = document.getElementById('recipe-memo');
        const ratingInputs = document.querySelectorAll('input[name="rating"]:checked');

        console.log('getFormData: 要素取得完了', {
            urlInput: !!urlInput,
            titleInput: !!titleInput,
            memoInput: !!memoInput,
            ratingInputs: ratingInputs.length
        });

        const formData = {
            url: urlInput ? urlInput.value.trim() : '',
            title: titleInput ? titleInput.value.trim() : '',
            memo: memoInput ? memoInput.value.trim() : '',
            rating: ratingInputs.length > 0 ? parseInt(ratingInputs[0].value) : 1
        };

        console.log('getFormData: フォームデータ作成完了', formData);
        return formData;
    }

    /**
     * フォームデータを検証する
     */
    validateFormData(formData) {
        console.log('validateFormData: 検証開始', formData);

        // URL必須チェック
        if (!formData.url) {
            console.log('validateFormData: URL が空です');
            this.ui.showMessage('URLを入力してください。', 'error');
            this.focusUrlInput();
            return false;
        }
        console.log('validateFormData: URL存在確認完了');

        // URL形式チェック
        if (!URLValidator.isValidURL(formData.url)) {
            console.log('validateFormData: URL形式が無効です');
            this.ui.showMessage('有効なURL形式で入力してください。（例: https://example.com/recipe）', 'error');
            this.focusUrlInput();
            return false;
        }
        console.log('validateFormData: URL形式確認完了');

        console.log('validateFormData: 検証成功');
        return true;
    }

    /**
     * URLインプットにフォーカスを当てる
     */
    focusUrlInput() {
        const urlInput = document.getElementById('recipe-url');
        if (urlInput) {
            urlInput.focus();
            urlInput.select();
        }
    }

    /**
     * フォームをリセットする
     */
    resetForm() {
        if (this.form) {
            this.form.reset();

            // デフォルトの評価（未定）を選択
            const defaultRating = document.getElementById('rating-1');
            if (defaultRating) {
                defaultRating.checked = true;
            }

            // URLインプットにフォーカスを当てる
            this.focusUrlInput();
        }
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - 統合アプリ初期化開始');

    try {
        // アプリケーションインスタンスを作成
        const app = new RecipeLinkSaver();

        // グローバルアクセス用に設定
        window.recipeLinkSaver = app;

        console.log('Recipe Link Saver アプリケーションが正常に初期化されました');

    } catch (error) {
        console.error('アプリケーションの初期化に失敗しました:', error);
        alert('アプリケーションの初期化中にエラーが発生しました。ページを再読み込みしてください。\nエラー: ' + error.message);
    }
});