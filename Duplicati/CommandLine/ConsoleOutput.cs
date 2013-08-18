//  Copyright (C) 2011, Kenneth Skovhede

//  http://www.hexad.dk, opensource@hexad.dk
//
//  This library is free software; you can redistribute it and/or modify
//  it under the terms of the GNU Lesser General Public License as
//  published by the Free Software Foundation; either version 2.1 of the
//  License, or (at your option) any later version.
//
//  This library is distributed in the hope that it will be useful, but
//  WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//  Lesser General Public License for more details.
//
//  You should have received a copy of the GNU Lesser General Public
//  License along with this library; if not, write to the Free Software
//  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
using System;
using System.Collections.Generic;
using Duplicati.Library.Main;

namespace Duplicati.CommandLine
{
    public class ConsoleOutput : Library.Main.IMessageSink
    {
        public bool QuietConsole { get; private set; }
        public bool VerboseOutput { get; private set; }
        public bool VerboseErrors { get; private set; }
        
        public ConsoleOutput(Dictionary<string, string> options)
        {
            this.QuietConsole = Library.Utility.Utility.ParseBoolOption(options, "quiet-console");
            this.VerboseOutput = Library.Utility.Utility.ParseBoolOption(options, "verbose");
            this.VerboseErrors = Library.Utility.Utility.ParseBoolOption(options, "debug-output");
        }
    
        #region IMessageSink implementation
        public void BackendEvent(BackendActionType action, BackendEventType type, string path, long size)
        {
            if (type == BackendEventType.Started)
            {
                if (action == BackendActionType.Put)
                    Console.WriteLine("Uploading file ({0}) ...", Library.Utility.Utility.FormatSizeString(size));
                else if (action == BackendActionType.Get)
                    Console.WriteLine("Downloading file ({0}) ...", size < 0 ? "unknown" : Library.Utility.Utility.FormatSizeString(size));
                else if (action == BackendActionType.List)
                    Console.WriteLine("Listing remote folder ...");
                else if (action == BackendActionType.CreateFolder)
                    Console.WriteLine("Creating remote folder ...");
                else if (action == BackendActionType.Delete)
                    Console.WriteLine("Deleting file ({0}) ...", size < 0 ? "unknown" : Library.Utility.Utility.FormatSizeString(size));
            }
        }
        
        public void BackendProgressEvent(BackendActionType action, string path, int progress, long bytes_pr_second)
        {
        }
        
        public void ProgressEvent(string message, int progress)
        {
            if (!QuietConsole)
                Console.WriteLine(string.Format("Progress {0} - {1}", progress, message));
        }
        
        public void VerboseEvent(string message, object[] args)
        {
            if (VerboseOutput)
                Console.WriteLine(message, args);
        }
        public void MessageEvent(string message)
        {
            if (!QuietConsole)
                Console.WriteLine(message);
        }
        public void RetryEvent(string message, Exception ex)
        {
            if (!QuietConsole)
                Console.WriteLine(ex == null ? message : string.Format("{0} => {1}", message, VerboseErrors ? ex.ToString() : ex.Message));
        }
        public void WarningEvent(string message, Exception ex)
        {
            if (!QuietConsole)
                Console.WriteLine(ex == null ? message : string.Format("{0} => {1}", message, VerboseErrors ? ex.ToString() : ex.Message));
        }
        public void ErrorEvent(string message, Exception ex)
        {
            if (!QuietConsole)
                Console.WriteLine(ex == null ? message : string.Format("{0} => {1}", message, VerboseErrors ? ex.ToString() : ex.Message));
        }
        public void DryrunEvent(string message)
        {
            Console.WriteLine(string.Format("[Dryrun]: {0}", message));
        }
        #endregion
    }
}

