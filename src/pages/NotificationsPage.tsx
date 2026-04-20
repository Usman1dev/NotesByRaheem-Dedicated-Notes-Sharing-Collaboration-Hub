import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import TopNav from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Check, Filter, Bell, ArrowLeft, Loader2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../services/notificationService';

type FilterType = 'all' | 'unread' | 'announcement' | 'note_pending_review' | 'note_approved' | 'note_rejected' | 'new_note_in_course' | 'note_uploaded';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/contact', icon: '✉️', label: 'Contact Owner' },
  { href: '/notifications', icon: '🔔', label: 'Notifications' },
];

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { notifications, isLoading, markAsRead, markAllAsRead, refreshNotifications, loadMore } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredUnreadCount = filteredNotifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    const actionUrl = notificationService.getActionUrl(notification);
    if (actionUrl) {
      if (actionUrl.startsWith('/')) {
        navigate(actionUrl);
      } else {
        window.location.href = actionUrl;
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All Notifications', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'announcement', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
    { value: 'note_pending_review', label: 'Pending Reviews', count: notifications.filter(n => n.type === 'note_pending_review').length },
    { value: 'note_approved', label: 'Approved Notes', count: notifications.filter(n => n.type === 'note_approved').length },
    { value: 'note_rejected', label: 'Rejected Notes', count: notifications.filter(n => n.type === 'note_rejected').length },
    { value: 'new_note_in_course', label: 'New Course Notes', count: notifications.filter(n => n.type === 'new_note_in_course').length },
    { value: 'note_uploaded', label: 'Your Uploads', count: notifications.filter(n => n.type === 'note_uploaded').length },
  ];

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Bell className="h-6 w-6" />
                    Notifications
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Manage all your notifications in one place
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  Filter
                  {filter !== 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {filterOptions.find(f => f.value === filter)?.label.split(' ')[0]}
                    </Badge>
                  )}
                </Button>
                
                {unreadCount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={handleMarkAllAsRead}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4" />
                    Mark all read
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={refreshNotifications}
                  disabled={isLoading}
                  aria-label="Refresh notifications"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '↻'}
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{notifications.length}</span>
                <span className="text-muted-foreground">total</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">{unreadCount}</span>
                <span className="text-muted-foreground">unread</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="font-medium">{filteredNotifications.length}</span>
                <span className="text-muted-foreground">filtered</span>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Filter by type</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="text-xs h-7"
                >
                  Clear filter
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {filterOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filter === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilters(false);
                    }}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm">{option.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {option.count}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {filter === 'all' ? 'No notifications yet' : 'No matching notifications'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {filter === 'all'
                    ? "You'll be notified about important updates, announcements, and note approvals here."
                    : `Try changing your filter to see more notifications.`}
                </p>
                {filter !== 'all' && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setFilter('all')}
                  >
                    Show all notifications
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredNotifications.length > 0 && filteredNotifications.length < notifications.length && (
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load more notifications'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg">
            <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
              <span className="text-lg">💡</span> About notifications
            </h4>
            <p className="text-sm text-muted-foreground">
              Notifications help you stay updated on important events. You'll receive notifications for:
              announcements, note approvals/rejections, new notes in your courses, and when admins need to review your uploads.
              Click on any notification to take action or mark it as read.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Notification Item Component (reused from NotificationBell with modifications)
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
      if (actionUrl.startsWith('/')) {
        navigate(actionUrl);
      } else {
        window.location.href = actionUrl;
      }
    }
  };

  return (
    <div
      className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${!is_read ? 'border-l-primary bg-primary/5' : 'border-l-transparent'} hover:bg-accent/30 hover:border-l-accent ${is_read ? 'opacity-90' : ''}`}
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
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{message}</p>
          
          {hasAction && actionText && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-border hover:bg-accent hover:text-accent-foreground"
                onClick={handleActionClick}
              >
                {actionText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}