import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Loader2, ExternalLink } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { notificationService } from '../services/notificationService';
import { Notification } from '../services/notificationService';

interface NotificationBellProps {
  className?: string;
  showDropdown?: boolean;
}

export default function NotificationBell({ className = '', showDropdown = true }: NotificationBellProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBellClick = () => {
    if (showDropdown) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        refreshNotifications();
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Handle notification action based on type
    const actionUrl = notificationService.getActionUrl(notification);
    if (actionUrl) {
      // Use React Router navigation for internal routes
      if (actionUrl.startsWith('/')) {
        navigate(actionUrl);
      } else {
        // For external URLs, use window.location
        window.location.href = actionUrl;
      }
    }
    
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-full"
        onClick={handleBellClick}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 min-w-0 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 sm:max-w-96 sm:w-96 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-2xl z-50 overflow-hidden transform -translate-x-1/2 left-1/2 sm:left-auto sm:translate-x-0 sm:right-0">
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-background to-background/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-lg">Notifications</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {unreadCount} unread • {notifications.length} total
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMarkAllAsRead}
                    disabled={isLoading}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  onClick={refreshNotifications}
                  disabled={isLoading}
                  title="Refresh"
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : '↻'}
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-80">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be notified about important updates here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {unreadNotifications.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Unread</p>
                        <div className="flex-1 h-px bg-border/50"></div>
                      </div>
                    </div>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </>
                )}

                {readNotifications.length > 0 && (
                  <>
                    {unreadNotifications.length > 0 && (
                      <div className="px-4 py-2">
                        <div className="h-px bg-border/30"></div>
                      </div>
                    )}
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50"></div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Earlier</p>
                        <div className="flex-1 h-px bg-border/30"></div>
                      </div>
                    </div>
                    {readNotifications.slice(0, 10).map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm"
                onClick={() => {
                  // Navigate to dedicated notifications page
                  navigate('/notifications');
                  setIsOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { type, title, message, created_at, is_read, data } = notification;
  const iconEmoji = notificationService.getNotificationIcon(type);
  const colorClass = notificationService.getNotificationColor(type);
  const bgColorClass = notificationService.getNotificationBackgroundColor(type);
  const hasAction = notificationService.hasActionButton(notification);
  const actionText = notificationService.getActionButtonText(notification);
  const navigate = useNavigate();

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const actionUrl = notificationService.getActionUrl(notification);
    if (actionUrl) {
      // Use React Router navigation for internal routes
      if (actionUrl.startsWith('/')) {
        navigate(actionUrl);
      } else {
        // For external URLs, use window.location
        window.location.href = actionUrl;
      }
    }
  };

  return (
    <div
      className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${!is_read ? 'border-l-primary bg-primary/5' : 'border-l-transparent'} hover:bg-accent/30 hover:border-l-accent ${is_read ? 'opacity-80' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bgColorClass} mt-1 flex-shrink-0`}>
          <span className="text-base">{iconEmoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium text-sm ${!is_read ? 'text-foreground font-semibold' : 'text-foreground/90'} line-clamp-1`}>
                {title}
              </h4>
              {!is_read && (
                <span className="inline-block h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {notificationService.formatRelativeTime(created_at)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{message}</p>
          
          {hasAction && actionText && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-border hover:bg-accent hover:text-accent-foreground"
                onClick={handleActionClick}
              >
                {actionText}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}