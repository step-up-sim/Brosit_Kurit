package ru.shag.quit;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Calendar;

public class ReminderReceiver extends BroadcastReceiver {
    public static void schedule(Context c, boolean enabled) {
        AlarmManager alarms = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = PendingIntent.getBroadcast(c, 1, new Intent(c, ReminderReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(pending);
        if (!enabled) return;
        Calendar time = Calendar.getInstance();
        time.set(Calendar.HOUR_OF_DAY, 20); time.set(Calendar.MINUTE, 30); time.set(Calendar.SECOND, 0); time.set(Calendar.MILLISECOND, 0);
        if(time.getTimeInMillis() <= System.currentTimeMillis()) time.add(Calendar.DATE, 1);
        alarms.setInexactRepeating(AlarmManager.RTC_WAKEUP, time.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pending);
    }
    @Override public void onReceive(Context c, Intent intent) {
        if (!c.getSharedPreferences("local", Context.MODE_PRIVATE).getBoolean("reminder", false)) return;
        if(Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel("diary", "Дневник", NotificationManager.IMPORTANCE_DEFAULT));
        PendingIntent open = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.notify(10, new Notification.Builder(c, "diary").setSmallIcon(ru.shag.quit.R.drawable.ic_sprout).setContentTitle("Как прошёл твой день?")
            .setContentText("Укажи количество за день в календаре.").setContentIntent(open).setAutoCancel(true).build());
    }
}
