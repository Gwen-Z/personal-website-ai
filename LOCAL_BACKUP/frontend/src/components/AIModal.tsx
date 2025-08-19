import React, { useState } from 'react'
import axios from 'axios'

interface AIModalProps {
  isOpen: boolean
  onClose: () => void
  context?: string // 当前页面的上下文信息
}

export default function AIModal({ isOpen, onClose, context }: AIModalProps) {
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 预设问题
  const suggestedQuestions = [
    '分析过去一周的数据',
    '根据过去一周的数据给出建议',
    '帮我总结我的个人偏好',
  ]

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 调用后端AI接口
      const response = await axios.post('/api/ai-chat', {
        message: message,
        context: context,
        history: messages
      })

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: response.data.reply || '抱歉，我现在无法回答这个问题。'
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI chat error:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: '抱歉，服务暂时不可用，请稍后再试。'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuestionClick = (question: string) => {
    handleSendMessage(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  // 返回到起始页（清空会话）
  const handleBackToHome = () => {
    setIsLoading(false)
    setInputValue('')
    setMessages([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md md:max-w-lg h-[80vh] max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {messages.length > 0 ? (
            <button
              onClick={handleBackToHome}
              aria-label="返回"
              title="返回起始页"
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-9 h-9"></div>
          )}
          <div className="text-center">
            <h2 className="font-semibold text-gray-900">AI个人助手</h2>
            <p className="text-xs text-gray-500">已接入 XX模型</p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* AI头像和欢迎语 */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-400 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="text-2xl">🤖</div>
            </div>
          </div>
          
          {messages.length === 0 && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">猜你想问</h3>
              <p className="text-sm text-gray-500 text-center mb-6">根据你的个人历史数据生成</p>
              
              {/* 预设问题 */}
              <div className="space-y-3 w-full">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(question)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>{question}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 对话区域 */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部输入区 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="快来找我聊聊吧~"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* 底部功能按钮 */}
          <div className="flex items-center justify-center mt-3 space-x-6">
            <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-xs">📄</span>
              </div>
              <span className="text-xs text-gray-600">占位1</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xs">🔥</span>
              </div>
              <span className="text-xs text-gray-600">占位2</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs">💡</span>
              </div>
              <span className="text-xs text-gray-600">占位3</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xs">🤖</span>
              </div>
              <span className="text-xs text-gray-600">占位4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
