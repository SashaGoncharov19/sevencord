import VoiceRoom from "./VoiceRoom";
import { useChat } from "../hooks/useChat";
import { useChatUI } from "../hooks/useChatUI";
import { ServerSidebar } from "./chat/ServerSidebar";
import { ChannelSidebar } from "./chat/ChannelSidebar";
import { MessageArea } from "./chat/MessageArea";
import { MembersSidebar } from "./chat/MembersSidebar";
import { DeviceSettingsModal } from "./chat/DeviceSettingsModal";

interface ChatLayoutProps {
	serverUrl: string;
	token: string;
	onDisconnect: () => void;
}

export default function ChatLayout({ serverUrl, token, onDisconnect }: ChatLayoutProps) {
	const {
		messages,
		users,
		currentUser,
		activeChannel,
		setActiveChannel,
		voiceChannel,
		setVoiceChannel,
		incomingSignals,
		globalVoiceUsers,
		sendMessage,
		sendSignal
	} = useChat(serverUrl, token);

	const {
		inputMessage, setInputMessage,
		isMuted, setIsMuted,
		isVideoOff, setIsVideoOff,
		showSettings, setShowSettings,
		showVoiceDebug, setShowVoiceDebug,
		devices, loadDevices,
		selectedAudioInput, setSelectedAudioInput,
		selectedVideoInput, setSelectedVideoInput,
		videoQuality, setVideoQuality,
		noiseSuppression, setNoiseSuppression,
		echoCancellation, setEchoCancellation,
		messagesEndRef,
		handleSendMessage,
		voiceStatus, setVoiceStatus
	} = useChatUI(messages, sendMessage, activeChannel);

	return (
		<div className="flex h-screen bg-gray-800 text-gray-100 overflow-hidden font-sans">
			<ServerSidebar onDisconnect={onDisconnect} />

			<ChannelSidebar
				activeChannel={activeChannel}
				setActiveChannel={setActiveChannel}
				voiceChannel={voiceChannel}
				setVoiceChannel={setVoiceChannel}
				globalVoiceUsers={globalVoiceUsers}
				currentUser={currentUser}
				isMuted={isMuted}
				setIsMuted={setIsMuted}
				isVideoOff={isVideoOff}
				setIsVideoOff={setIsVideoOff}
				loadDevices={loadDevices}
				setShowSettings={setShowSettings}
				voiceStatus={voiceStatus}
				onVoiceStatusClick={() => setShowVoiceDebug(true)}
			/>

			<MessageArea
				serverUrl={serverUrl}
				activeChannel={activeChannel}
				messages={messages}
				messagesEndRef={messagesEndRef}
				inputMessage={inputMessage}
				setInputMessage={setInputMessage}
				handleSendMessage={handleSendMessage}
			>
				{voiceChannel && currentUser && (
					<VoiceRoom
						channelId={voiceChannel}
						currentUserId={currentUser.id}
						onSendSignal={sendSignal}
						incomingSignals={incomingSignals}
						onDisconnect={() => {
							setVoiceChannel(null);
							setActiveChannel("general");
						}}
						isMuted={isMuted}
						isVideoOff={isVideoOff}
						onToggleMute={() => setIsMuted(!isMuted)}
						onToggleVideo={() => setIsVideoOff(!isVideoOff)}
						isVisible={activeChannel === "lobby"}
						audioDeviceId={selectedAudioInput}
						videoDeviceId={selectedVideoInput}
						videoQuality={videoQuality}
						noiseSuppression={noiseSuppression}
						echoCancellation={echoCancellation}
						onStatusChange={setVoiceStatus}
						showVoiceDebug={showVoiceDebug}
						onCloseVoiceDebug={() => setShowVoiceDebug(false)}
						serverUrl={serverUrl}
					/>
				)}
			</MessageArea>

			<MembersSidebar users={users} />

			{showSettings && (
				<DeviceSettingsModal
					setShowSettings={setShowSettings}
					devices={devices}
					selectedAudioInput={selectedAudioInput}
					setSelectedAudioInput={setSelectedAudioInput}
					selectedVideoInput={selectedVideoInput}
					setSelectedVideoInput={setSelectedVideoInput}
					videoQuality={videoQuality}
					setVideoQuality={setVideoQuality}
					noiseSuppression={noiseSuppression}
					setNoiseSuppression={setNoiseSuppression}
					echoCancellation={echoCancellation}
					setEchoCancellation={setEchoCancellation}
				/>
			)}
		</div>
	);
}
