// ملف مساعد لاستدعاء الـ API من Frontend

class APIClient {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || "/api";
    this.token = localStorage.getItem("authToken");
  }

  // تعيين التوكن للمصادقة
  setToken(token) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  // إزالة التوكن
  clearToken() {
    this.token = null;
    localStorage.removeItem("authToken");
  }

  // إضافة رؤوس الطلب
  getHeaders() {
    const headers = {
      "Content-Type": "application/json"
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // طلب GET
  async get(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}/${endpoint}${queryString ? `?${queryString}` : ""}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الطلب: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("خطأ في طلب GET:", error);
      throw error;
    }
  }

  // طلب POST
  async post(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}/${endpoint}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الطلب: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("خطأ في طلب POST:", error);
      throw error;
    }
  }

  // طلب PUT
  async put(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}/${endpoint}`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الطلب: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("خطأ في طلب PUT:", error);
      throw error;
    }
  }

  // طلب DELETE
  async delete(endpoint) {
    try {
      const url = `${this.baseURL}/${endpoint}`;
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`خطأ في الطلب: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("خطأ في طلب DELETE:", error);
      throw error;
    }
  }
}

// إنشاء مثيل من APIClient
const apiClient = new APIClient();

// تصدير المثيل
export default apiClient;