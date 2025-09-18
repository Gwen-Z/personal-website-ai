// API客户端配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface Notebook {
  id: string;
  name: string;
  note_count: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  notebook_id: string;
  title: string;
  image_url: string;
  duration_minutes: number;
  created_at: string;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 获取笔记本列表
const getNotebooks = async (): Promise<Notebook[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notebooks`);
    const data = await response.json();
    
    if (data.success) {
      return data.notebooks || [];
    } else {
      throw new Error(data.message || 'Failed to fetch notebooks');
    }
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    throw error;
  }
};

// 获取笔记列表
const getNotes = async (notebookId: string): Promise<{ notebook: Notebook; notes: Note[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notes?notebook_id=${notebookId}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        notebook: data.notebook,
        notes: data.notes || []
      };
    } else {
      throw new Error(data.message || 'Failed to fetch notes');
    }
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

// 健康检查
const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// HTTP客户端类
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async get(url: string, options?: { params?: any }) {
    const queryString = options?.params ? '?' + new URLSearchParams(options.params).toString() : '';
    const response = await fetch(`${this.baseURL}${url}${queryString}`);
    const data = await response.json();
    return { data, status: response.status, headers: response.headers };
  }

  async post(url: string, data?: any) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const responseData = await response.json();
    return { data: responseData, status: response.status, headers: response.headers };
  }

  async put(url: string, data?: any) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const responseData = await response.json();
    return { data: responseData, status: response.status, headers: response.headers };
  }

  async delete(url: string, options?: { data?: any }) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options?.data ? JSON.stringify(options.data) : undefined,
    });
    const responseData = await response.json();
    return { data: responseData, status: response.status, headers: response.headers };
  }

  // 原有的方法
  async getNotebooks(): Promise<Notebook[]> {
    return getNotebooks();
  }

  async getNotes(notebookId: string): Promise<{ notebook: Notebook; notes: Note[] }> {
    return getNotes(notebookId);
  }

  async healthCheck(): Promise<boolean> {
    return healthCheck();
  }
}

// 创建默认实例
const apiClient = new ApiClient();

// 默认导出所有API函数和客户端实例
export default apiClient;

// 同时导出所有函数，以便组件可以直接导入
export { getNotebooks, getNotes, healthCheck };
