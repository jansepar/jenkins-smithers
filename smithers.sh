#!/bin/bash
# set -x
DESC="Smithers server, assistant to Jenkins"
NAME=$0
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_NAME=smithers.js

echo $DIR

d_start()
{
    sudo node $DIR/$SCRIPT_NAME >/var/log/smithers-access.log 2>/var/log/smithers-error.log & 
}

d_stop()
{
    GREP=`ps auxwww | grep smithers.js | grep -v grep | head -1`
    if [[ -n $GREP  ]]; then
        PID=`echo $GREP | awk '{ print $2 }'`
            echo "-- Killing server PID: $PID"
            kill $PID
    else
        echo "-- No process to kill for smithers.js"
    fi
}

ACTION="$1"
case "$ACTION" in
    start)
        echo "Starting $DESC: $NAME"
        d_start
        echo "."
        ;;

    stop)
        echo "Stopping $DESC: $NAME"
        d_stop
        echo "."
        ;;

    restart|force-reload)
        echo "Restarting $DESC: $NAME"
        d_stop
        sleep 2
        d_start
        echo "-- DONE"
        ;;

    *)
        echo "Usage: $NAME {start|stop|restart|force-reload}" >&2
        exit 3
        ;;
esac


exit 0
