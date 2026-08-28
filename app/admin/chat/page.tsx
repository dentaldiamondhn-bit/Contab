'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Input, Button, Textarea, 
  Badge, Separator,
  ScrollArea
} from '@/components/ui';
import { 
  MessageCircle, 
  Users, 
  Building2,
  CheckCircle2,
  X,
  Search,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useRouter, usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant: {
      id: string;
      businessName: string;
      tenantCode: string;
    } | null;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant: {
      id: string;
      businessName: string;
      tenantCode: string;
    } | null;
  } | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: {
    id: string;
    businessName: string;
    tenantCode: string;
  } | null;
  unreadCount: number;
}

interface ChatTenant {
  id: string;
  businessName: string;
  tenantCode: string;
}

export default function ChatPage() {
  const { isLoaded, isSuperAdmin, isSupport, user } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [tenants, setTenants] = useState<ChatTenant[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'users' | 'tenants' | 'broadcast'>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load initial data
  useEffect(() => {
    loadChatData();
    
    // Set up polling for new messages
    const interval = setInterval(() => {
      if (!loading && (selectedUserId || selectedTenantId || filterType === 'broadcast')) {
        loadRecentMessages();
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [loading]);
  
  // Load chat data (users, tenants, initial messages)
  const loadChatData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersResponse = await fetch(`/api/support/users`);
      if (usersResponse.ok) {
        try {
          const usersData = await usersResponse.json();
          const formattedUsers = (usersData.users || []).map((user: any) => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email,
            role: user.role,
            tenant: user.tenant_name && user.tenant_code ? {
              id: user.tenantId || '',
              businessName: user.tenant_name,
              tenantCode: user.tenant_code
            } : null,
            unreadCount: 0
          }));
          setUsers(formattedUsers);
        } catch (e) {
          console.warn('Failed to parse users response');
        }
      }
      
      // Load tenants
      const tenantsResponse = await fetch(`/api/support/tenants`);
      if (tenantsResponse.ok) {
        try {
          const tenantsData = await tenantsResponse.json();
          const formattedTenants = (tenantsData.tenants || []).map((tenant: any) => ({
            id: tenant.id,
            businessName: tenant.businessName,
            tenantCode: tenant.tenantCode
          }));
          setTenants(formattedTenants);
        } catch (e) {
          console.warn('Failed to parse tenants response');
        }
      }
      
      // Load initial messages
      await loadRecentMessages();
      
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load recent messages based on current filters
  const loadRecentMessages = async () => {
    try {
      let url = '/api/admin/chat?limit=100';
      
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      } else if (selectedTenantId) {
        // For tenant filter, we'd need a different approach since our API doesn't directly support tenant filtering
        // For now, we'll filter on the client side after fetching
      }
      
      const response = await fetch(url);
      if (response.ok) {
        try {
          const data = await response.json();
          const formattedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          sender: {
            id: msg.sender.id,
            name: msg.sender.name,
            email: msg.sender.email,
            role: msg.sender.role,
            tenant: msg.sender.tenant ? {
              id: msg.sender.tenant.id,
              businessName: msg.sender.tenant.businessName,
              tenantCode: msg.sender.tenant.tenantCode
            } : null
          },
          receiver: msg.receiver ? {
            id: msg.receiver.id,
            name: msg.receiver.name,
            email: msg.receiver.email,
            role: msg.receiver.role,
            tenant: msg.receiver.tenant ? {
              id: msg.receiver.tenant.id,
              businessName: msg.receiver.tenant.businessName,
              tenantCode: msg.receiver.tenant.tenantCode
            } : null
          } : null,
          message: msg.message,
          isRead: msg.isRead,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        }));
        
        setMessages(formattedMessages);
        
        // Calculate unread count for the selected conversation
        if (selectedUserId) {
          const unread = formattedMessages.filter(
            msg => !msg.isRead && msg.receiver?.id === user?.id && msg.sender.id === selectedUserId
          ).length;
          setUnreadCount(unread);
        }
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        } catch (e) {
          console.warn('Failed to parse chat messages');
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    if (!selectedUserId && !selectedTenantId && filterType !== 'broadcast') {
      alert('Por favor seleccione un usuario, tenant o el modo broadcast');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUserId || null,
          message: newMessage.trim()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Mark as read if we sent it to ourselves (shouldn't happen but just in case)
        if (data.message.sender.id === user?.id) {
          // Update local state
          setMessages(prev => 
            prev.map(msg => 
              msg.id === data.message.id ? { ...msg, isRead: true } : msg
            )
          );
        }
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje');
    }
  };
  
  // Mark messages as read
  const markAsRead = async () => {
    if (!selectedUserId) return;
    
    try {
      // Find unread messages from the selected user to the current user
      const unreadMessages = messages.filter(
        msg => !msg.isRead && msg.sender.id === selectedUserId && msg.receiver?.id === user?.id
      );
      
      for (const msg of unreadMessages) {
        await fetch(`/api/admin/chat?id=${msg.id}`, {
          method: 'PUT'
        });
      }
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.sender.id === selectedUserId && msg.receiver?.id === user?.id && !msg.isRead
            ? { ...msg, isRead: true }
            : msg
        )
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Filter messages based on current selection
  const filteredMessages = messages.filter(msg => {
    // If viewing broadcast messages
    if (filterType === 'broadcast') {
      return !msg.receiver; // Broadcast messages have null receiver
    }
    
    // If viewing messages with a specific user
    if (selectedUserId) {
      return (msg.sender.id === selectedUserId && msg.receiver?.id === user?.id) ||
             (msg.sender.id === user?.id && msg.receiver?.id === selectedUserId);
    }
    
    // If viewing messages with a specific tenant (simplified - would need better backend support)
    if (selectedTenantId) {
      const tenantUserIds = users
        .filter(user => user.tenant?.id === selectedTenantId)
        .map(user => user.id);
      
      return tenantUserIds.includes(msg.sender.id) || 
             tenantUserIds.includes(msg.receiver?.id ?? '');
    }
    
    // Show all messages (for debugging)
    return true;
  }).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Handle Enter key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-500 font-medium">Cargando chat...</p>
        </div>
      </div>
    );
  }
  
  if (!isSuperAdmin && !isSupport) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">No tiene permiso para acceder al chat</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Chat de Soporte</h1>
              <p className="text-sm text-gray-500">Comunicación con tenants y usuarios</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSelectedUserId(null);
              setSelectedTenantId(null);
              setFilterType('all');
              setSearchTerm('');
            }}
          >
            Limpiar Filtros
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4">
          <Input
            placeholder="Buscar usuarios o tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterType('users')}
              className={filterType === 'users' ? 'bg-blue-50 text-blue-700' : ''}
            >
              Usuarios
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterType('tenants')}
              className={filterType === 'tenants' ? 'bg-blue-50 text-blue-700' : ''}
            >
              Tenants
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterType('broadcast')}
              className={filterType === 'broadcast' ? 'bg-blue-50 text-blue-700' : ''}
            >
              Broadcast
            </Button>
          </div>
        </div>
        
        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filterType === 'users' && (
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Usuarios</p>
              <div className="space-y-2">
                {users
                  .filter(user => 
                    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        selectedUserId === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedTenantId(null);
                        setFilterType('users');
                        markAsRead(); // Mark as read when selecting
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            {user.email && (
                              <p className="text-xs text-gray-500">{user.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {user.unreadCount > 0 && (
                        <Badge className="ml-2">
                          {user.unreadCount > 99 ? '99+' : user.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {filterType === 'tenants' && (
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Tenants</p>
              <div className="space-y-2">
                {tenants
                  .filter(tenant => 
                    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(tenant => (
                    <div
                      key={tenant.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        selectedTenantId === tenant.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedTenantId(tenant.id);
                        setSelectedUserId(null);
                        setFilterType('tenants');
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tenant.businessName}</p>
                            <p className="text-xs text-gray-500">{tenant.tenantCode}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {filterType === 'broadcast' && (
            <div className="p-4">
              <div className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                filterType === 'broadcast' ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }" onClick={() => {
                setFilterType('broadcast');
                setSelectedUserId(null);
                setSelectedTenantId(null);
              }}>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Mensajes Broadcast</p>
                      <p className="text-xs text-gray-500">Mensajes enviados a todos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            {selectedUserId ? (
              <>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {users.find(u => u.id === selectedUserId)?.name.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {users.find(u => u.id === selectedUserId)?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {users.find(u => u.id === selectedUserId)?.email || ''}
                  </p>
                </div>
              </>
            ) : selectedTenantId ? (
              <>
                <Building2 className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {tenants.find(t => t.id === selectedTenantId)?.businessName || 'Tenant'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tenants.find(t => t.id === selectedTenantId)?.tenantCode || ''}
                  </p>
                </div>
              </>
            ) : (
              <>
                <MessageCircle className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Mensajes Broadcast</p>
                  <p className="text-xs text-gray-500">Conversación global</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {selectedUserId && unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAsRead}
              disabled={!selectedUserId || unreadCount === 0}
            >
              Marcar como Leído
            </Button>
          </div>
        </div>
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando mensajes...</p>
            </div>
          )}
          
          {!loading && filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {selectedUserId ? 
                  'No hay mensajes con este usuario. ¡Envía el primero!' : 
                  selectedTenantId ?
                    'No hay mensajes con este tenant.' :
                    'No hay mensajes broadcast.'}
              </p>
            </div>
          )}
          
          {!loading && filteredMessages.length > 0 && (
            <>
              {filteredMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'} max-w-[80%]`}
                >
                  <div className="relative">
                    {/* Sender Avatar */}
                    {!message.sender.id && (
                      <div className="absolute left-0 top-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        S
                      </div>
                    )}
                    {message.sender.id && message.sender.id !== user?.id && (
                      <div className="absolute left-0 top-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`ml-4 mr-2 max-w-xs rounded-lg px-4 py-2 ${
                      message.sender.id === user?.id 
                        ? 'bg-blue-500 text-white ml-auto' 
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                      <div className="flex items-center mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        {!message.isRead && message.receiver?.id === user?.id && (
                          <span className="ml-2 h-2 w-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    </div>
                    
                    {/* Receiver Avatar (for broadcast or when receiving) */}
                    {(!message.receiver || message.receiver.id === user?.id) && (
                      <div className="absolute right-0 top-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {!message.receiver && (
                          <div className="text-xs">B</div>
                        )}
                        {message.receiver && message.receiver.id === user?.id && (
                          <div className="text-xs">{message.sender.name.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Input Area */}
        <div className="px-4 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={2}
              className="flex-1 resize-none"
              disabled={!selectedUserId && !selectedTenantId && filterType !== 'broadcast'}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || (!selectedUserId && !selectedTenantId && filterType !== 'broadcast')}
              className={!newMessage.trim() || (!selectedUserId && !selectedTenantId && filterType !== 'broadcast') 
                ? 'opacity-50 cursor-not-allowed' 
                : ''}
            >
              Enviar
            </Button>
          </div>
          {!selectedUserId && !selectedTenantId && filterType !== 'broadcast' && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Seleccione un usuario, tenant o el modo broadcast para comenzar a chatear
            </p>
          )}
        </div>
      </div>
    </div>
  );
}